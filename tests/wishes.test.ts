// Integration test against TEST_DATABASE_URL: SQL visibility must agree with authz.canSeeWish,
// and the activity feed must never leak text the circle can't see.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";
import { canSeeWish } from "@/lib/authz";
import type { Role, Visibility } from "@/lib/db/types";

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("wishes", async () => {
  const q = await import("@/lib/db/queries/wishes");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  const ids: Record<"author" | "family" | "doctor" | "chosen" | "outsider", string> = {} as never;
  let circleId = "";
  let otherCircleId = "";

  beforeAll(async () => {
    for (const k of Object.keys({ author: 1, family: 1, doctor: 1, chosen: 1, outsider: 1 }) as (keyof typeof ids)[]) {
      const [u] = await raw<{ id: string }[]>`insert into users (email, name) values (${`${k}-${tag}@example.test`}, ${k}) returning id`;
      ids[k] = u!.id;
    }
    const [c] = await raw<{ id: string }[]>`insert into circles (patient_name) values (${`Test ${tag}`}) returning id`;
    const [c2] = await raw<{ id: string }[]>`insert into circles (patient_name) values (${`Other ${tag}`}) returning id`;
    circleId = c!.id;
    otherCircleId = c2!.id;
    const roles: [keyof typeof ids, Role][] = [["author", "owner"], ["family", "viewer"], ["doctor", "caretaker"], ["chosen", "viewer"]];
    for (const [k, role] of roles) await raw`insert into memberships (circle_id, user_id, role) values (${circleId}, ${ids[k]}, ${role})`;
    await raw`insert into memberships (circle_id, user_id, role) values (${otherCircleId}, ${ids.outsider}, 'owner')`;
  });

  afterAll(async () => {
    await raw`delete from circles where id in (${circleId}, ${otherCircleId})`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  const make = (visibility: Visibility, viewerIds: string[] = []) =>
    q.createWish(circleId, ids.author, { text: `${visibility} wish ${tag}`, category: "places", visibility, viewerIds });

  it("list visibility matches canSeeWish for every role", async () => {
    const wishes = [await make("circle"), await make("chosen", [ids.chosen, ids.outsider]), await make("private")];
    const roleOf: Record<string, Role> = { author: "owner", family: "viewer", doctor: "caretaker", chosen: "viewer" };
    for (const who of ["author", "family", "doctor", "chosen"] as const) {
      const listed = new Set((await q.listVisibleWishes(circleId, ids[who], 100)).map((w) => w.id));
      for (const w of wishes) {
        const detail = await q.findWishForMember(w.id, ids[who]);
        const allowed = canSeeWish({ userId: ids[who], role: roleOf[who]! }, w, detail?.viewer_ids ?? []);
        expect(listed.has(w.id), `${who} / ${w.visibility}`).toBe(allowed);
      }
    }
  });

  it("non-members can't be chosen viewers and can't load the wish", async () => {
    const w = await make("chosen", [ids.chosen, ids.outsider]);
    const detail = await q.findWishForMember(w.id, ids.author);
    expect(detail?.viewer_ids).toEqual([ids.chosen]);
    expect(await q.findWishForMember(w.id, ids.outsider)).toBeNull();
  });

  it("feed: circle wishes show text, chosen wishes don't, private wishes leave nothing", async () => {
    const [c, ch, p] = [await make("circle"), await make("chosen", [ids.chosen]), await make("private")];
    const rows = await raw<{ ref_id: string; payload: Record<string, unknown> }[]>`
      select ref_id, payload from activity where ref_id in (${c.id}, ${ch.id}, ${p.id})`;
    const by = Object.fromEntries(rows.map((r) => [r.ref_id, r.payload]));
    expect(by[c.id]).toMatchObject({ text: c.text });
    expect(by[ch.id]).toBeDefined();
    expect(by[ch.id]).not.toHaveProperty("text");
    expect(by[p.id]).toBeUndefined();
  });

  it("sharing a private wish posts it to the feed; only the author can edit", async () => {
    const w = await make("private");
    expect(await q.updateWish(w.id, ids.family, { text: "x", category: "places", visibility: "circle", viewerIds: [] })).toBeNull();
    const updated = await q.updateWish(w.id, ids.author, { text: w.text, category: "tastes", visibility: "circle", viewerIds: [] });
    expect(updated?.visibility).toBe("circle");
    const [row] = await raw<{ n: number }[]>`select count(*)::int as n from activity where ref_id = ${w.id} and type = 'wish_added'`;
    expect(row!.n).toBe(1);
  });
});
