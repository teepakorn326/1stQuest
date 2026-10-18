// Integration test against TEST_DATABASE_URL: card + media visibility.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";
import { canSeeCard } from "@/lib/authz";

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

describe("canSeeCard", () => {
  const v = { userId: "u", role: "viewer" as const };
  it("cards with no wish are for the whole circle; others follow the wish", () => {
    expect(canSeeCard(v, { wish_id: null, wish_author_id: null, wish_visibility: null })).toBe(true);
    expect(canSeeCard(v, { wish_id: "w", wish_author_id: "x", wish_visibility: "private" })).toBe(false);
    expect(canSeeCard(v, { wish_id: "w", wish_author_id: "x", wish_visibility: "chosen" }, ["u"])).toBe(true);
    expect(canSeeCard({ userId: "u", role: null }, { wish_id: null, wish_author_id: null, wish_visibility: null })).toBe(false);
  });
});

d("cards and media", async () => {
  const wishes = await import("@/lib/db/queries/wishes");
  const cards = await import("@/lib/db/queries/cards");
  const media = await import("@/lib/db/queries/media");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  const ids = { owner: "", tom: "", outsider: "" };
  let circleId = "";
  let otherCircle = "";

  const photo = async (uploader: string) => {
    const id = crypto.randomUUID();
    await media.insertMedia({ id, circleId, uploaderId: uploader, path: `${circleId}/${id}.jpg`, mimeType: "image/jpeg", bytes: 10 });
    return id;
  };

  beforeAll(async () => {
    for (const k of Object.keys(ids) as (keyof typeof ids)[]) {
      const [u] = await raw<{ id: string }[]>`insert into users (email, name) values (${`${k}-${tag}@example.test`}, ${k}) returning id`;
      ids[k] = u!.id;
    }
    const [c] = await raw<{ id: string }[]>`insert into circles (patient_name) values (${`Cards ${tag}`}) returning id`;
    const [c2] = await raw<{ id: string }[]>`insert into circles (patient_name) values (${`Other ${tag}`}) returning id`;
    circleId = c!.id;
    otherCircle = c2!.id;
    await raw`insert into memberships (circle_id, user_id, role) values (${circleId}, ${ids.owner}, 'owner'), (${circleId}, ${ids.tom}, 'viewer')`;
    await raw`insert into memberships (circle_id, user_id, role) values (${otherCircle}, ${ids.outsider}, 'owner')`;
  });

  afterAll(async () => {
    await raw`delete from circles where id in (${circleId}, ${otherCircle})`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  it("a card only takes the author's own unattached photos; first photo is the cover", async () => {
    const w = await wishes.createWish(circleId, ids.owner, { text: "Bondi", category: "places", visibility: "circle", viewerIds: [] });
    const [mine1, mine2, toms] = [await photo(ids.owner), await photo(ids.owner), await photo(ids.tom)];
    const card = await cards.createCard({
      circleId, authorId: ids.owner, wish: { id: w.id, text: w.text, category: w.category }, category: "places",
      title: "T", body: "B", story: "S", place: null, mediaIds: [mine2, toms, mine1],
    });
    expect(card.cover_media_id).toBe(mine2);
    const detail = await cards.findCardForMember(card.id, ids.tom);
    expect(new Set(detail!.photo_ids)).toEqual(new Set([mine1, mine2]));
  });

  it("media and cards follow the wish's visibility", async () => {
    const w = await wishes.createWish(circleId, ids.owner, { text: "Private", category: "people", visibility: "private", viewerIds: [] });
    const p = await photo(ids.owner);
    const card = await cards.createCard({
      circleId, authorId: ids.owner, wish: { id: w.id, text: w.text, category: w.category }, category: "people",
      title: "Secret", body: "B", story: "S", place: null, mediaIds: [p],
    });
    expect(await media.findMediaPathForMember(p, ids.owner)).toBeTruthy();
    expect(await media.findMediaPathForMember(p, ids.tom)).toBeNull();
    expect(await media.findMediaPathForMember(p, ids.outsider)).toBeNull();
    expect((await cards.listBookCards(circleId, ids.owner)).some((c) => c.id === card.id)).toBe(true);
    expect((await cards.listBookCards(circleId, ids.tom)).some((c) => c.id === card.id)).toBe(false);
  });

  it("photos not yet on a card are visible only to their uploader", async () => {
    const p = await photo(ids.owner);
    expect(await media.findMediaPathForMember(p, ids.owner)).toBeTruthy();
    expect(await media.findMediaPathForMember(p, ids.tom)).toBeNull();
  });

  it("messages show on the card and post to the feed", async () => {
    const card = await cards.createCard({
      circleId, authorId: ids.owner, wish: null, category: "nature", title: "Jacarandas", body: "B", story: "S", place: null, mediaIds: [],
    });
    const detail = (await cards.findCardForMember(card.id, ids.owner))!;
    await cards.addMessage(detail, ids.tom, "Lovely");
    const after = (await cards.findCardForMember(card.id, ids.owner))!;
    expect(after.messages.map((m) => m.text)).toEqual(["Lovely"]);
    const [row] = await raw<{ n: number }[]>`select count(*)::int as n from activity where ref_id = ${card.id} and type = 'card_message'`;
    expect(row!.n).toBe(1);
  });
});
