import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));

describe("text message", async () => {
  process.env.APP_URL = "https://1stquest.example";
  const { textFor } = await import("@/lib/notify");
  it("names who posted, whose circle, the post and a link", () => {
    expect(textFor({ kind: "card", actorName: "Ploy", patientName: "Nana Rose", title: "The wind took Nana’s hat", path: "/cards/abc" })).toBe(
      "1stQuest: Ploy made a new card in Nana Rose’s circle: “The wind took Nana’s hat” https://1stquest.example/cards/abc",
    );
  });
});

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("notifications when the owner posts", async () => {
  const wishes = await import("@/lib/db/queries/wishes");
  const cards = await import("@/lib/db/queries/cards");
  const q = await import("@/lib/db/queries/notifications");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  const ids = { owner: "", texter: "", quiet: "", outsider: "" };
  let circleId = "";

  beforeAll(async () => {
    for (const k of Object.keys(ids) as (keyof typeof ids)[]) {
      ids[k] = (await raw<{ id: string }[]>`insert into users (email, name) values (${`${k}-${tag}@example.test`}, ${k}) returning id`)[0]!.id;
    }
    circleId = (await raw<{ id: string }[]>`insert into circles (patient_name) values (${`N ${tag}`}) returning id`)[0]!.id;
    await raw`insert into memberships (circle_id, user_id, role) values
      (${circleId}, ${ids.owner}, 'owner'), (${circleId}, ${ids.texter}, 'family'), (${circleId}, ${ids.quiet}, 'family')`;
    await q.setPhone(ids.texter, "+61400000001", true);
    await q.setPhone(ids.quiet, "+61400000002", false); // has a number but didn't opt in
  });
  afterAll(async () => {
    await raw`delete from circles where id = ${circleId}`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  const count = async (userId: string) => q.countUnread(userId);

  it("a circle wish notifies every other member; texts only the opted-in", async () => {
    const w = await wishes.createWish(circleId, ids.owner, { text: "See the sea", category: "places", visibility: "circle", viewerIds: [] });
    expect(w.sms).toEqual([{ user_id: ids.texter, phone: "+61400000001" }]);
    expect(await count(ids.texter)).toBe(1);
    expect(await count(ids.quiet)).toBe(1);
    expect(await count(ids.owner)).toBe(0);
    expect(await count(ids.outsider)).toBe(0);
  });

  it("private wishes notify no one; chosen wishes only the chosen", async () => {
    const before = { texter: await count(ids.texter), quiet: await count(ids.quiet) };
    const p = await wishes.createWish(circleId, ids.owner, { text: "Secret", category: "people", visibility: "private", viewerIds: [] });
    expect(p.sms).toEqual([]);
    const c = await wishes.createWish(circleId, ids.owner, { text: "For quiet", category: "people", visibility: "chosen", viewerIds: [ids.quiet] });
    expect(c.sms).toEqual([]); // quiet didn't opt in to texts
    expect(await count(ids.texter)).toBe(before.texter);
    expect(await count(ids.quiet)).toBe(before.quiet + 1);
  });

  it("a card notifies too, with a link to it; reading clears the count", async () => {
    const card = await cards.createCard({ circleId, authorId: ids.owner, wish: null, category: "nature", title: "Jacarandas", body: "B", story: "S", place: null, mediaIds: [] });
    expect(card.sms.map((r) => r.user_id)).toEqual([ids.texter]);
    const [latest] = await q.listNotifications(ids.texter, 1);
    expect(latest).toMatchObject({ kind: "memory", title: "Jacarandas", url: `/cards/${card.id}` });
    await q.markAllRead(ids.texter);
    expect(await count(ids.texter)).toBe(0);
  });
});
