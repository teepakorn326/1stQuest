import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomToken } from "@/lib/auth/tokens";
import { canSwitchMode, memorialUndoUntil } from "@/lib/authz";
import { extFor, kindOf, LIMITS } from "@/lib/mediaLimits";

describe("media limits", () => {
  it("classifies types (ignoring codec parameters) and picks extensions", () => {
    expect(kindOf("image/jpeg")).toBe("photo");
    expect(kindOf("audio/webm;codecs=opus")).toBe("voice");
    expect(kindOf("video/quicktime")).toBe("video");
    expect(kindOf("application/pdf")).toBeNull();
    expect(extFor("audio/webm;codecs=opus")).toBe("webm");
    expect(extFor("audio/mp4")).toBe("m4a");
    expect(extFor("video/quicktime")).toBe("mov");
  });

  it("voice is capped at 5 minutes, video at 2 minutes and 50MB", () => {
    expect(LIMITS.voice.maxSeconds).toBe(300);
    expect(LIMITS.video.maxSeconds).toBe(120);
    expect(LIMITS.video.maxBytes).toBe(50 * 1024 * 1024);
  });
});

describe("memorial undo window", () => {
  const now = new Date("2026-10-17T00:00:00Z");
  const owner = { userId: "o", role: "owner" as const };
  it("undo stays available for 30 days, owner only", () => {
    const changed = new Date(now.getTime() - 29 * 86_400_000);
    const c = { mode: "memorial" as const, mode_changed_at: changed };
    expect(memorialUndoUntil(c)!.getTime()).toBe(changed.getTime() + 30 * 86_400_000);
    expect(canSwitchMode(owner, c, now)).toBe(true);
    expect(canSwitchMode({ userId: "f", role: "family" }, c, now)).toBe(false);
    expect(memorialUndoUntil({ mode: "active", mode_changed_at: null })).toBeNull();
  });
});

const url = process.env.DATABASE_URL;
const d = url ? describe : describe.skip;

d("level-up and recordings", async () => {
  const cards = await import("@/lib/db/queries/cards");
  const media = await import("@/lib/db/queries/media");
  const raw = postgres(url!, { max: 1, prepare: false });
  const tag = randomToken(6).toLowerCase();
  const ids = { a: "", b: "", c: "" };
  let circleId = "";

  beforeAll(async () => {
    for (const k of Object.keys(ids) as (keyof typeof ids)[]) {
      const [u] = await raw<{ id: string }[]>`insert into users (email, name) values (${`${k}-${tag}@example.test`}, ${k}) returning id`;
      ids[k] = u!.id;
    }
    const [c] = await raw<{ id: string }[]>`insert into circles (patient_name) values (${`L ${tag}`}) returning id`;
    circleId = c!.id;
    await raw`insert into memberships (circle_id, user_id, role) values
      (${circleId}, ${ids.a}, 'owner'), (${circleId}, ${ids.b}, 'family'), (${circleId}, ${ids.c}, 'family')`;
  });

  afterAll(async () => {
    await raw`delete from circles where id = ${circleId}`;
    await raw`delete from users where email like ${`%-${tag}@example.test`}`;
    await raw.end();
  });

  const newCard = (mediaIds: string[] = []) =>
    cards.createCard({ circleId, authorId: ids.a, wish: null, category: "people", title: "T", body: "B", story: "S", place: null, mediaIds });
  const level = async (id: string) => (await raw<{ level: number }[]>`select level from cards where id = ${id}`)[0]!.level;

  it("turns gold at the first comment, exactly once; photos and voice notes alone don't", async () => {
    const card = await newCard();
    const detail = (await cards.findCardForMember(card.id, ids.a))!;
    const voice = crypto.randomUUID();
    await media.insertMedia({ id: voice, circleId, uploaderId: ids.a, path: `${circleId}/${voice}.webm`, mimeType: "audio/webm", bytes: 5, kind: "voice", durationSec: 12 });
    const r = await media.attachPhotosToCard({ cardId: card.id, circleId, wishId: null, wishText: null, cardTitle: "T", actorId: ids.a, mediaIds: [voice] });
    expect(r).toMatchObject({ added: 1, levelledUp: false });
    expect(await level(card.id)).toBe(0);
    expect((await cards.addMessage(detail, ids.b, "lovely")).levelledUp).toBe(true);
    expect(await level(card.id)).toBe(1);
    expect((await cards.addMessage(detail, ids.c, "again")).levelledUp).toBe(false);
    const [{ n }] = (await raw<{ n: number }[]>`select count(*)::int as n from activity where ref_id = ${card.id} and type = 'card_levelled_up'`) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });

  it("the cover is the first photo even when a voice note comes first; recordings are listed", async () => {
    const voice = crypto.randomUUID();
    const photo = crypto.randomUUID();
    await media.insertMedia({ id: voice, circleId, uploaderId: ids.a, path: `${circleId}/${voice}.webm`, mimeType: "audio/webm", bytes: 5, kind: "voice", durationSec: 40 });
    await media.insertMedia({ id: photo, circleId, uploaderId: ids.a, path: `${circleId}/${photo}.jpg`, mimeType: "image/jpeg", bytes: 5 });
    const card = await newCard([voice, photo]);
    expect(card.cover_media_id).toBe(photo);
    const detail = (await cards.findCardForMember(card.id, ids.b))!;
    expect(detail.photo_ids).toEqual([photo]);
    expect(detail.recordings).toMatchObject([{ id: voice, kind: "voice", duration_sec: 40 }]);
  });
});
