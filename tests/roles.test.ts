import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("caretakers create circles and add people; sign-in codes", async () => {
  const circles = await import("@/lib/db/queries/circles");
  const people = await import("@/lib/db/queries/people");
  const codes = await import("@/lib/auth/loginCode");
  const tributes = await import("@/lib/db/queries/tributes");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  const mail = (k: string) => `${k}-${tag}@example.test`;
  const phone = (n: number) => `+6681${String(Date.now()).slice(-6)}${n}`;
  let caretakerId = "";
  const made: string[] = [];

  beforeAll(async () => {
    const [u] = await raw<{ id: string }[]>`insert into users (email, name) values (${mail("care")}, 'Ploy') returning id`;
    caretakerId = u!.id;
  });
  afterAll(async () => {
    if (made.length) await raw`delete from circles where id in ${raw(made)}`;
    await raw`delete from login_codes where contact like ${`%-${tag}@example.test`}`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  const roleOf = async (circleId: string, userId: string) =>
    (await raw<{ role: string }[]>`select role from memberships where circle_id = ${circleId} and user_id = ${userId}`)[0]?.role;

  it("creating a circle makes the person's account (owner) and the creator a caretaker", async () => {
    const p = phone(1);
    const c = await circles.createCircle({ caretakerId, patient: { name: "Rose", email: mail("rose"), phone: p }, mobility: "walks_alone", mobilityNotes: null });
    made.push(c.id);
    const [rose] = await raw<{ id: string; name: string; phone: string }[]>`select id, name, phone from users where email = ${mail("rose")}`;
    expect(rose).toMatchObject({ name: "Rose", phone: p });
    expect(await roleOf(c.id, rose!.id)).toBe("owner");
    expect(await roleOf(c.id, caretakerId)).toBe("caretaker");
    expect(c.join_token).toMatch(/^[0-9a-f]{32}$/);
    expect(await people.findJoinTarget(c.join_token)).toEqual({ circle_id: c.id, patient_name: "Rose" });
  });

  it("refuses the caretaker's own email, and a number already on another account", async () => {
    await expect(circles.createCircle({ caretakerId, patient: { name: "Me", email: mail("care"), phone: null }, mobility: "walks_alone", mobilityNotes: null })).rejects.toMatchObject({ reason: "is_you" });
    const p = phone(2);
    const c = await circles.createCircle({ caretakerId, patient: { name: "A", email: mail("a"), phone: p }, mobility: "walks_alone", mobilityNotes: null });
    made.push(c.id);
    await expect(people.addPerson({ circleId: c.id, actorId: caretakerId, name: "B", email: mail("b"), phone: p, role: "viewer" })).rejects.toMatchObject({ reason: "phone_taken" });
  });

  it("adds people once, fills in a missing number, and never removes the owner", async () => {
    const c = await circles.createCircle({ caretakerId, patient: { name: "R2", email: mail("r2"), phone: null }, mobility: "walks_alone", mobilityNotes: null });
    made.push(c.id);
    const p = phone(3);
    const tom = await people.addPerson({ circleId: c.id, actorId: caretakerId, name: "Tom", email: mail("tom"), phone: p, role: "viewer" });
    expect(tom.phone).toBe(p);
    expect(await roleOf(c.id, tom.id)).toBe("viewer");
    await expect(people.addPerson({ circleId: c.id, actorId: caretakerId, name: "Tom", email: mail("tom"), phone: null, role: "viewer" })).rejects.toMatchObject({ reason: "already_member" });
    const [owner] = await raw<{ user_id: string }[]>`select user_id from memberships where circle_id = ${c.id} and role = 'owner'`;
    expect(await people.removePerson(c.id, owner!.user_id)).toBe(false);
    expect(await people.removePerson(c.id, tom.id)).toBe(true);
    expect(await roleOf(c.id, tom.id)).toBeUndefined();
  });

  it("a code works once, wrong tries count, and too many lock it", async () => {
    const who = mail("codes");
    const issued = await codes.issueLoginCode(who, "/join/x");
    if (!("code" in issued)) throw new Error("rate limited");
    expect(issued.code).toMatch(/^\d{6}$/);
    const wrong = issued.code === "000000" ? "111111" : "000000";
    expect(await codes.checkLoginCode(who, wrong)).toEqual({ ok: false, reason: "wrong" });
    expect(await codes.checkLoginCode(who, issued.code)).toEqual({ ok: true, next: "/join/x" });
    expect(await codes.checkLoginCode(who, issued.code)).toEqual({ ok: false, reason: "expired" }); // used

    // Asking twice: the first code still works.
    const first = await codes.issueLoginCode(who, "/a");
    const second = await codes.issueLoginCode(who, "/b");
    if (!("code" in first) || !("code" in second)) throw new Error("rate limited");
    expect(await codes.checkLoginCode(who, first.code)).toEqual({ ok: true, next: "/a" });

    const again = await codes.issueLoginCode(who, null);
    if (!("code" in again)) throw new Error("rate limited");
    const bad = again.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) await codes.checkLoginCode(who, bad);
    expect(await codes.checkLoginCode(who, bad)).toEqual({ ok: false, reason: "too_many" });
    expect(await codes.checkLoginCode(who, again.code)).toEqual({ ok: false, reason: "too_many" });
  });

  it("at most 5 codes per address every 15 minutes", async () => {
    const who = mail("flood");
    for (let i = 0; i < 5; i++) expect("code" in (await codes.issueLoginCode(who, null))).toBe(true);
    expect(await codes.issueLoginCode(who, null)).toEqual({ rateLimited: true });
  });

  it("candles and flowers: one of each per person a day, messages listed newest first", async () => {
    const c = await circles.createCircle({ caretakerId, patient: { name: "Mem", email: mail("mem"), phone: null }, mobility: "walks_alone", mobilityNotes: null });
    made.push(c.id);
    expect(await tributes.addTribute({ circleId: c.id, userId: caretakerId, kind: "candle", message: null })).toBe(true);
    expect(await tributes.addTribute({ circleId: c.id, userId: caretakerId, kind: "candle", message: null })).toBe(false);
    expect(await tributes.addTribute({ circleId: c.id, userId: caretakerId, kind: "flower", message: "Thank you" })).toBe(true);
    const t = await tributes.tributeSummary(c.id, caretakerId);
    expect(t).toMatchObject({ candles: 1, flowers: 1, litToday: true, flowerToday: true });
    expect(t.messages.map((m) => m.message)).toEqual(["Thank you"]);
    await tributes.setHeadstone(c.id, { birthYear: 1941, deathYear: 2026, epitaph: "Always in our book" });
    const [row] = await raw<{ birth_year: number; death_year: number; epitaph: string }[]>`select birth_year, death_year, epitaph from circles where id = ${c.id}`;
    expect(row).toEqual({ birth_year: 1941, death_year: 2026, epitaph: "Always in our book" });
  });
});
