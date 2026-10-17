// Integration test against TEST_DATABASE_URL: plans, quest transitions and feed visibility.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("plans, quests and the feed", async () => {
  const wishes = await import("@/lib/db/queries/wishes");
  const quests = await import("@/lib/db/queries/quests");
  const activity = await import("@/lib/db/queries/activity");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  const ids = { owner: "", tom: "", may: "" };
  let circleId = "";
  const output = (titles: string[]) => ({
    plan: "A slow morning.",
    needsCareTeam: true,
    careTeamNote: "about the trip.",
    quests: titles.map((title) => ({ title, needsCareTeam: false })),
  });

  beforeAll(async () => {
    for (const k of Object.keys(ids) as (keyof typeof ids)[]) {
      const [u] = await raw<{ id: string }[]>`insert into users (email, name) values (${`${k}-${tag}@example.test`}, ${k}) returning id`;
      ids[k] = u!.id;
    }
    const [c] = await raw<{ id: string }[]>`insert into circles (patient_name) values (${`Plans ${tag}`}) returning id`;
    circleId = c!.id;
    await raw`insert into memberships (circle_id, user_id, role) values
      (${circleId}, ${ids.owner}, 'owner'), (${circleId}, ${ids.tom}, 'family'), (${circleId}, ${ids.may}, 'family')`;
  });

  afterAll(async () => {
    await raw`delete from circles where id = ${circleId}`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  it("updating a plan keeps every existing quest and appends new ones", async () => {
    const w = await wishes.createWish(circleId, ids.owner, { text: "Bondi", category: "places", visibility: "circle", viewerIds: [] });
    await wishes.savePlan({ wish: w, actorId: ids.owner, mobility: "wheelchair", output: output(["A", "B"]) });
    const first = await wishes.findLatestPlan(w.id);
    const a = first!.quests.find((q) => q.title === "A")!;
    const ctx = (await quests.findQuestForMember(a.id, ids.tom))!;
    await quests.moveQuest({ quest: ctx, actorId: ids.tom, from: "open", to: "in_progress", claimedBy: ids.tom });

    await wishes.savePlan({ wish: w, actorId: ids.owner, mobility: "wheelchair", output: output(["C"]) });
    const second = await wishes.findLatestPlan(w.id);
    expect(second!.id).not.toBe(first!.id);
    expect(second!.care_team_note).toBe("about the trip.");
    expect(second!.quests.map((q) => [q.title, q.status])).toEqual([
      ["A", "in_progress"],
      ["B", "open"],
      ["C", "open"],
    ]);
    const [{ n }] = (await raw<{ n: number }[]>`select count(*)::int as n from plans where wish_id = ${w.id}`) as unknown as [{ n: number }];
    expect(n).toBe(2); // history kept
  });

  it("two people claiming at once: exactly one wins", async () => {
    const w = await wishes.createWish(circleId, ids.owner, { text: "Race", category: "places", visibility: "circle", viewerIds: [] });
    await wishes.savePlan({ wish: w, actorId: ids.owner, mobility: "wheelchair", output: output(["Only one"]) });
    const q = (await wishes.findLatestPlan(w.id))!.quests[0]!;
    const [tomCtx, mayCtx] = [await quests.findQuestForMember(q.id, ids.tom), await quests.findQuestForMember(q.id, ids.may)];
    const results = await Promise.all([
      quests.moveQuest({ quest: tomCtx!, actorId: ids.tom, from: "open", to: "in_progress", claimedBy: ids.tom }),
      quests.moveQuest({ quest: mayCtx!, actorId: ids.may, from: "open", to: "in_progress", claimedBy: ids.may }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const [{ n }] = (await raw<{ n: number }[]>`select count(*)::int as n from activity where ref_id = ${q.id} and type = 'quest_claimed'`) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });

  it("private wishes get locked quests, which unlock when shared", async () => {
    const w = await wishes.createWish(circleId, ids.owner, { text: "Secret", category: "people", visibility: "private", viewerIds: [] });
    await wishes.savePlan({ wish: w, actorId: ids.owner, mobility: "wheelchair", output: output(["X"]) });
    expect((await wishes.findLatestPlan(w.id))!.quests[0]!.status).toBe("locked");
    await wishes.updateWish(w.id, ids.owner, { text: "Secret", category: "people", visibility: "circle", viewerIds: [] });
    expect((await wishes.findLatestPlan(w.id))!.quests[0]!.status).toBe("open");
  });

  it("the feed hides quest and plan activity on wishes the viewer can't see", async () => {
    const w = await wishes.createWish(circleId, ids.owner, { text: "For May only", category: "people", visibility: "chosen", viewerIds: [ids.may] });
    await wishes.savePlan({ wish: w, actorId: ids.owner, mobility: "wheelchair", output: output(["Hidden quest"]) });
    const q = (await wishes.findLatestPlan(w.id))!.quests[0]!;
    await quests.moveQuest({ quest: (await quests.findQuestForMember(q.id, ids.may))!, actorId: ids.may, from: "open", to: "in_progress", claimedBy: ids.may });
    const about = (rows: { wish_id: string | null }[]) => rows.filter((r) => r.wish_id === w.id).length;
    expect(about(await activity.listActivity(circleId, ids.may))).toBe(3); // wish_added, plan_generated, quest_claimed
    expect(about(await activity.listActivity(circleId, ids.owner))).toBe(3);
    expect(about(await activity.listActivity(circleId, ids.tom))).toBe(0);
    expect(about(await activity.listActivity(circleId, ids.may, { filter: "quests" }))).toBe(2);
  });
});
