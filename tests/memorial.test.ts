import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";
import { canAsk, canCancel, canConfirm, canNameTrusted, canTrustedSwitch, isDue, takesEffectAt } from "@/lib/memorial";

const active = { mode: "active" as const, trusted_user_id: "t" };
const owner = { userId: "o", role: "owner" as const };
const caretaker = { userId: "c", role: "caretaker" as const };
const trusted = { userId: "t", role: "viewer" as const };
const fam = { userId: "f", role: "viewer" as const };
const fam2 = { userId: "g", role: "viewer" as const };

describe("memorial handover rules", () => {
  it("the owner or a caretaker names a trusted person, and only a viewer", () => {
    expect(canNameTrusted(caretaker, "viewer")).toBe(true);
    expect(canNameTrusted(owner, "viewer")).toBe(true);
    expect(canNameTrusted(caretaker, null)).toBe(true);
    expect(canNameTrusted(caretaker, "caretaker")).toBe(false);
    expect(canNameTrusted(fam, "viewer")).toBe(false);
  });

  it("the trusted viewer can switch while the book is active", () => {
    expect(canTrustedSwitch(trusted, active)).toBe(true);
    expect(canTrustedSwitch(fam, active)).toBe(false);
    expect(canTrustedSwitch(trusted, { ...active, mode: "memorial" })).toBe(false);
  });

  it("one viewer asks, a different one confirms; caretakers switch themselves instead", () => {
    const open = { requested_by: "f", confirmed_by: null, takes_effect_at: null };
    expect(canAsk(fam, active, null)).toBe(true);
    expect(canAsk(fam, active, open)).toBe(false);
    expect(canAsk(caretaker, active, null)).toBe(false);
    expect(canAsk(owner, active, null)).toBe(false);
    expect(canConfirm(fam, active, open)).toBe(false);
    expect(canConfirm(fam2, active, open)).toBe(true);
    expect(canConfirm(caretaker, active, open)).toBe(false);
    expect(canConfirm(fam2, active, { ...open, confirmed_by: "h" })).toBe(false);
  });

  it("the owner, caretakers and the two viewers can cancel; others can't", () => {
    const open = { requested_by: "f", confirmed_by: "g", takes_effect_at: new Date() };
    expect(canCancel(owner, open)).toBe(true);
    expect(canCancel(caretaker, open)).toBe(true);
    expect(canCancel(fam, open)).toBe(true);
    expect(canCancel(fam2, open)).toBe(true);
    expect(canCancel(trusted, open)).toBe(false);
    expect(canCancel(caretaker, null)).toBe(false);
  });

  it("takes effect 7 days after confirming", () => {
    const at = new Date("2026-10-18T00:00:00Z");
    const when = takesEffectAt(at);
    expect(when.toISOString()).toBe("2026-10-25T00:00:00.000Z");
    const open = { requested_by: "f", confirmed_by: "g", takes_effect_at: when };
    expect(isDue(open, new Date("2026-10-24T23:59:00Z"))).toBe(false);
    expect(isDue(open, when)).toBe(true);
    expect(isDue({ ...open, takes_effect_at: null }, when)).toBe(false);
  });
});

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("memorial handover in the database", async () => {
  const m = await import("@/lib/db/queries/memorial");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  const ids = { o: "", c: "", t: "", f: "", g: "" };
  const circles: string[] = [];

  beforeAll(async () => {
    for (const k of Object.keys(ids) as (keyof typeof ids)[]) {
      const [u] = await raw<{ id: string }[]>`insert into users (email, name) values (${`${k}-${tag}@example.test`}, ${k}) returning id`;
      ids[k] = u!.id;
    }
  });
  afterAll(async () => {
    if (circles.length) await raw`delete from circles where id in ${raw(circles)}`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  async function newCircle() {
    const [c] = await raw<{ id: string }[]>`insert into circles (patient_name, set_up_by_patient) values (${`R ${tag}`}, true) returning id`;
    circles.push(c!.id);
    await raw`insert into memberships (circle_id, user_id, role) values
      (${c!.id}, ${ids.o}, 'owner'), (${c!.id}, ${ids.c}, 'caretaker'), (${c!.id}, ${ids.t}, 'viewer'),
      (${c!.id}, ${ids.f}, 'viewer'), (${c!.id}, ${ids.g}, 'viewer')`;
    return { circleId: c!.id, patientName: "R" };
  }
  const roleOf = async (circleId: string, userId: string) =>
    (await raw<{ role: string }[]>`select role from memberships where circle_id = ${circleId} and user_id = ${userId}`)[0]!.role;
  const modeOf = async (circleId: string) => (await raw<{ mode: string }[]>`select mode from circles where id = ${circleId}`)[0]!.mode;

  it("names only a viewer as trusted", async () => {
    const c = await newCircle();
    expect(await m.setTrusted(c.circleId, ids.c)).toBe(false);
    expect(await m.setTrusted(c.circleId, ids.t)).toBe(true);
  });

  it("the trusted viewer switches now and becomes a caretaker; nobody else's role changes", async () => {
    const c = await newCircle();
    await m.setTrusted(c.circleId, ids.t);
    expect(await m.trustedSwitch(c, ids.f)).toBeNull();
    expect(await m.trustedSwitch(c, ids.t)).not.toBeNull();
    expect(await modeOf(c.circleId)).toBe("memorial");
    expect(await roleOf(c.circleId, ids.t)).toBe("caretaker");
    expect(await roleOf(c.circleId, ids.o)).toBe("owner");
    expect(await roleOf(c.circleId, ids.c)).toBe("caretaker");
    const [{ n }] = (await raw<{ n: number }[]>`select count(*)::int n from notifications where circle_id = ${c.circleId} and kind = 'memorial_switched'`) as unknown as [{ n: number }];
    expect(n).toBe(4); // everyone but the one who switched
    expect(await m.trustedSwitch(c, ids.t)).toBeNull(); // already done
  });

  it("ask → confirm → 7 days → the asker becomes a caretaker; one open request at a time", async () => {
    const c = await newCircle();
    expect(await m.askMemorial(c, ids.f)).not.toBeNull();
    expect(await m.askMemorial(c, ids.g)).toBeNull();
    expect(await m.confirmMemorial(c, ids.f)).toBeNull(); // not the asker
    const done = await m.confirmMemorial(c, ids.g);
    expect(done!.takesEffectAt.getTime()).toBeGreaterThan(Date.now() + 6.9 * 86_400_000);
    expect(await m.applyDueRequest(c)).toBeNull(); // not yet
    expect(await modeOf(c.circleId)).toBe("active");
    await raw`update memorial_requests set takes_effect_at = now() - interval '1 minute' where circle_id = ${c.circleId}`;
    expect(await m.applyDueRequest(c)).not.toBeNull();
    expect(await modeOf(c.circleId)).toBe("memorial");
    expect(await roleOf(c.circleId, ids.f)).toBe("caretaker");
    expect(await roleOf(c.circleId, ids.o)).toBe("owner");
    expect(await m.findOpenRequest(c.circleId)).toBeNull();
  });

  it("a caretaker cancels during the 7 days and nothing changes", async () => {
    const c = await newCircle();
    await m.askMemorial(c, ids.f);
    await m.confirmMemorial(c, ids.g);
    expect(await m.cancelMemorial(c, ids.c)).not.toBeNull();
    await raw`update memorial_requests set takes_effect_at = now() - interval '1 minute' where circle_id = ${c.circleId}`;
    expect(await m.applyDueRequest(c)).toBeNull();
    expect(await modeOf(c.circleId)).toBe("active");
    expect(await roleOf(c.circleId, ids.f)).toBe("viewer");
    expect(await m.askMemorial(c, ids.f)).not.toBeNull(); // can ask again later
  });
});
