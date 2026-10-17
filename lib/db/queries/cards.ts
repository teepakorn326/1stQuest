import "server-only";
import { sql } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import { maybeLevelUp } from "@/lib/db/queries/levels";
import { notifyCircle, type SmsRecipient } from "@/lib/db/queries/notifications";
import { wishVisibleTo } from "@/lib/db/queries/visibility";
import type { CardRow, Category, Role, Visibility } from "@/lib/db/types";

export async function createCard(input: {
  circleId: string;
  authorId: string;
  wish: { id: string; text: string; category: Category } | null;
  category: Category;
  title: string;
  body: string;
  story: string;
  place: string | null;
  mediaIds: string[];
}): Promise<CardRow & { sms: SmsRecipient[] }> {
  return sql.begin(async (tx) => {
    const [card] = await tx<CardRow[]>`
      insert into cards (wish_id, circle_id, author_id, category, title, body, story, place)
      values (${input.wish?.id ?? null}, ${input.circleId}, ${input.authorId}, ${input.category},
              ${input.title}, ${input.body}, ${input.story}, ${input.place})
      returning *`;
    if (input.mediaIds.length) {
      const attached = await tx<{ id: string; kind: string }[]>`
        update media set card_id = ${card!.id}
        where circle_id = ${input.circleId} and uploader_id = ${input.authorId}
          and card_id is null and id = any(${input.mediaIds}::uuid[])
        returning id, kind`;
      // The cover is the first photo in the order given (never a voice note or video).
      const ids = new Set(attached.filter((r) => r.kind === "photo").map((r) => r.id));
      const cover = input.mediaIds.find((id) => ids.has(id));
      if (cover) await tx`update cards set cover_media_id = ${cover} where id = ${card!.id}`;
      card!.cover_media_id = cover ?? null;
    }
    await insertActivity(tx, {
      circleId: input.circleId,
      actorId: input.authorId,
      type: "card_created",
      wishId: input.wish?.id ?? null,
      refId: card!.id,
      payload: { title: input.title, wish: input.wish?.text ?? null },
    });
    const sms = await notifyCircle(tx, {
      circleId: input.circleId,
      actorId: input.authorId,
      wishId: input.wish?.id ?? null,
      kind: input.wish ? "card" : "memory",
      title: input.title,
      url: `/cards/${card!.id}`,
    });
    return Object.assign(card!, { sms });
  });
}

export type CardDetail = CardRow & {
  author_name: string | null;
  wish_text: string | null;
  wish_author_id: string | null;
  wish_visibility: Visibility | null;
  viewer_role: Role;
  viewer_ids: string[];
  photo_ids: string[];
  recordings: { id: string; kind: "voice" | "video"; duration_sec: number | null; uploader_id: string | null; uploader_name: string | null }[];
  messages: { id: string; author_id: string; author_name: string | null; text: string; created_at: string }[];
};

/** Card + everything its page needs, in one query. Null if the viewer isn't in the circle. */
export async function findCardForMember(cardId: string, viewerId: string): Promise<CardDetail | null> {
  const [row] = await sql<CardDetail[]>`
    select c.*, au.name as author_name, m.role as viewer_role,
      w.text as wish_text, w.author_id as wish_author_id, w.visibility as wish_visibility,
      coalesce((select array_agg(v.user_id) from wish_viewers v where v.wish_id = w.id), '{}') as viewer_ids,
      coalesce((select array_agg(md.id order by md.created_at) from media md where md.card_id = c.id and md.kind = 'photo'), '{}') as photo_ids,
      coalesce((select json_agg(json_build_object('id', md.id, 'kind', md.kind, 'duration_sec', md.duration_sec,
                  'uploader_id', md.uploader_id, 'uploader_name', uu.name) order by md.created_at)
                from media md left join users uu on uu.id = md.uploader_id
                where md.card_id = c.id and md.kind <> 'photo'), '[]') as recordings,
      coalesce((select json_agg(json_build_object('id', cm.id, 'author_id', cm.author_id, 'author_name', mu.name,
                  'text', cm.text, 'created_at', cm.created_at) order by cm.created_at)
                from card_messages cm left join users mu on mu.id = cm.author_id where cm.card_id = c.id), '[]') as messages
    from cards c
    join memberships m on m.circle_id = c.circle_id and m.user_id = ${viewerId}
    left join users au on au.id = c.author_id
    left join wishes w on w.id = c.wish_id
    where c.id = ${cardId}`;
  return row ?? null;
}

export async function updateCardWords(cardId: string, authorId: string, title: string, body: string): Promise<CardRow | null> {
  const [row] = await sql<CardRow[]>`
    update cards set title = ${title}, body = ${body}
    where id = ${cardId} and author_id = ${authorId} returning *`;
  return row ?? null;
}


export async function addMessage(
  card: Pick<CardDetail, "id" | "circle_id" | "wish_id" | "title">,
  authorId: string,
  text: string,
): Promise<{ id: string; levelledUp: boolean }> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into card_messages (card_id, author_id, text) values (${card.id}, ${authorId}, ${text}) returning id`;
    await insertActivity(tx, {
      circleId: card.circle_id,
      actorId: authorId,
      type: "card_message",
      wishId: card.wish_id,
      refId: card.id,
      payload: { title: card.title },
    });
    return { id: row!.id, levelledUp: await maybeLevelUp(tx, card.id) };
  });
}

export type BookCard = Pick<CardRow, "id" | "title" | "category" | "happened_on" | "place" | "cover_media_id" | "level" | "created_at" | "wish_id">;

/** Every card this viewer may see, newest first. */
export async function listBookCards(circleId: string, viewerId: string, wishId?: string): Promise<BookCard[]> {
  return sql<BookCard[]>`
    select c.id, c.title, c.category, c.happened_on, c.place, c.cover_media_id, c.level, c.created_at, c.wish_id
    from cards c left join wishes w on w.id = c.wish_id
    where c.circle_id = ${circleId}
      and (w.id is null or ${wishVisibleTo(viewerId)})
      ${wishId ? sql`and c.wish_id = ${wishId}` : sql``}
    order by c.happened_on desc, c.created_at desc`;
}

export type RecentCard = BookCard & { author_name: string | null; photos: number; voices: number; videos: number; messages: number };

/** Newest cards (by when they were added) for memorial Home, with what each holds. */
export async function listRecentCards(circleId: string, viewerId: string, limit = 5): Promise<RecentCard[]> {
  return sql<RecentCard[]>`
    select c.id, c.title, c.category, c.happened_on, c.place, c.cover_media_id, c.level, c.created_at, c.wish_id,
      u.name as author_name,
      (select count(*)::int from media m where m.card_id = c.id and m.kind = 'photo') as photos,
      (select count(*)::int from media m where m.card_id = c.id and m.kind = 'voice') as voices,
      (select count(*)::int from media m where m.card_id = c.id and m.kind = 'video') as videos,
      (select count(*)::int from card_messages cm where cm.card_id = c.id) as messages
    from cards c
    left join wishes w on w.id = c.wish_id
    left join users u on u.id = c.author_id
    where c.circle_id = ${circleId} and (w.id is null or ${wishVisibleTo(viewerId)})
    order by c.created_at desc
    limit ${limit}`;
}

export type ExportCard = BookCard & {
  body: string;
  author_name: string | null;
  photos: { id: string; path: string }[];
  recordings: { id: string; kind: "voice" | "video"; uploader_name: string | null }[];
};

/** Everything a printed book or slideshow needs, for cards this viewer may see, in one query. */
export async function listCardsForExport(circleId: string, viewerId: string): Promise<ExportCard[]> {
  return sql<ExportCard[]>`
    select c.id, c.title, c.body, c.category, c.happened_on, c.place, c.cover_media_id, c.level, c.created_at, c.wish_id,
      u.name as author_name,
      coalesce((select json_agg(json_build_object('id', m.id, 'path', m.path) order by (m.id = c.cover_media_id) desc, m.created_at)
                from media m where m.card_id = c.id and m.kind = 'photo'), '[]') as photos,
      coalesce((select json_agg(json_build_object('id', m.id, 'kind', m.kind, 'uploader_name', mu.name) order by m.created_at)
                from media m left join users mu on mu.id = m.uploader_id where m.card_id = c.id and m.kind <> 'photo'), '[]') as recordings
    from cards c
    left join wishes w on w.id = c.wish_id
    left join users u on u.id = c.author_id
    where c.circle_id = ${circleId} and (w.id is null or ${wishVisibleTo(viewerId)})`;
}

/** Turns the public share link on (keeping an existing token) or off. Author only. */
export async function setCardShare(cardId: string, authorId: string, token: string | null): Promise<string | null | undefined> {
  const [row] = await sql<{ share_token: string | null }[]>`
    update cards
    set share_token = case when ${token}::text is null then null else coalesce(share_token, ${token}) end,
        shared_at = case when ${token}::text is null then null else coalesce(shared_at, now()) end
    where id = ${cardId} and author_id = ${authorId}
    returning share_token`;
  return row ? row.share_token : undefined;
}

export type SharedCard = Pick<CardRow, "id" | "title" | "body" | "category" | "happened_on" | "place" | "level"> & {
  patient_name: string;
  photo_ids: string[];
  recordings: { id: string; kind: "voice" | "video"; duration_sec: number | null }[];
};

/** What a public share link shows: the card itself and nothing else from the circle. */
export async function findSharedCard(token: string): Promise<SharedCard | null> {
  const [row] = await sql<SharedCard[]>`
    select c.id, c.title, c.body, c.category, c.happened_on, c.place, c.level, ci.patient_name,
      coalesce((select array_agg(m.id order by (m.id = c.cover_media_id) desc, m.created_at)
                from media m where m.card_id = c.id and m.kind = 'photo'), '{}') as photo_ids,
      coalesce((select json_agg(json_build_object('id', m.id, 'kind', m.kind, 'duration_sec', m.duration_sec) order by m.created_at)
                from media m where m.card_id = c.id and m.kind <> 'photo'), '[]') as recordings
    from cards c join circles ci on ci.id = c.circle_id
    where c.share_token = ${token}`;
  return row ?? null;
}

/** Storage path of a media item on a shared card, or null. */
export async function findSharedMediaPath(token: string, mediaId: string): Promise<string | null> {
  const [row] = await sql<{ path: string }[]>`
    select m.path from media m join cards c on c.id = m.card_id
    where c.share_token = ${token} and m.id = ${mediaId}`;
  return row?.path ?? null;
}
