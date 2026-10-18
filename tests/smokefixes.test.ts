import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";
import { canPost } from "@/lib/authz";

describe("canPost", () => {
  it("only the owner posts", () => {
    expect(canPost({ userId: "o", role: "owner" })).toBe(true);
    expect(canPost({ userId: "f", role: "viewer" })).toBe(false);
    expect(canPost({ userId: "d", role: "viewer" })).toBe(false);
    expect(canPost({ userId: "x", role: null })).toBe(false);
  });
});

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("public share link", async () => {
  const cards = await import("@/lib/db/queries/cards");
  const media = await import("@/lib/db/queries/media");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  let owner = "";
  let other = "";
  let circleId = "";

  beforeAll(async () => {
    const ids = await Promise.all(
      ["o", "x"].map(async (k) => (await raw<{ id: string }[]>`insert into users (email, name) values (${`${k}-${tag}@example.test`}, ${k}) returning id`)[0]!.id),
    );
    owner = ids[0]!;
    other = ids[1]!;
    circleId = (await raw<{ id: string }[]>`insert into circles (patient_name) values (${`S ${tag}`}) returning id`)[0]!.id;
    await raw`insert into memberships (circle_id, user_id, role) values (${circleId}, ${owner}, 'owner')`;
  });
  afterAll(async () => {
    await raw`delete from circles where id = ${circleId}`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  it("reuses the token, shows only that card and its media, and stops working when revoked", async () => {
    const p1 = crypto.randomUUID();
    await media.insertMedia({ id: p1, circleId, uploaderId: owner, path: `${circleId}/${p1}.jpg`, mimeType: "image/jpeg", bytes: 1 });
    const shared = await cards.createCard({ circleId, authorId: owner, wish: null, category: "places", title: "Shared", body: "B", story: "S", place: null, mediaIds: [p1] });
    const p2 = crypto.randomUUID();
    await media.insertMedia({ id: p2, circleId, uploaderId: owner, path: `${circleId}/${p2}.jpg`, mimeType: "image/jpeg", bytes: 1 });
    await cards.createCard({ circleId, authorId: owner, wish: null, category: "people", title: "Private", body: "B", story: "S", place: null, mediaIds: [p2] });

    expect(await cards.setCardShare(shared.id, other, "nope-not-author")).toBeUndefined();
    const t1 = await cards.setCardShare(shared.id, owner, "token-aaaaaaaaaaaa");
    const t2 = await cards.setCardShare(shared.id, owner, "token-bbbbbbbbbbbb");
    expect(t1).toBe("token-aaaaaaaaaaaa");
    expect(t2).toBe(t1); // re-sharing keeps the same link

    const view = await cards.findSharedCard(t1!);
    expect(view).toMatchObject({ id: shared.id, title: "Shared", photo_ids: [p1] });
    expect(await cards.findSharedMediaPath(t1!, p1)).toBeTruthy();
    expect(await cards.findSharedMediaPath(t1!, p2)).toBeNull(); // another card's photo

    await cards.setCardShare(shared.id, owner, null);
    expect(await cards.findSharedCard(t1!)).toBeNull();
    expect(await cards.findSharedMediaPath(t1!, p1)).toBeNull();
  });
});
