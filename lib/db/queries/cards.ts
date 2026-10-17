import "server-only";
import { sql } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
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
}): Promise<CardRow> {
  return sql.begin(async (tx) => {
    const [card] = await tx<CardRow[]>`
      insert into cards (wish_id, circle_id, author_id, category, title, body, story, place)
      values (${input.wish?.id ?? null}, ${input.circleId}, ${input.authorId}, ${input.category},
              ${input.title}, ${input.body}, ${input.story}, ${input.place})
      returning *`;
    if (input.mediaIds.length) {
      const attached = await tx<{ id: string }[]>`
        update media set card_id = ${card!.id}
        where circle_id = ${input.circleId} and uploader_id = ${input.authorId}
          and card_id is null and id = any(${input.mediaIds}::uuid[])
        returning id`;
      const ids = new Set(attached.map((r) => r.id));
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
    return card!;
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
  like_count: number;
  liked_by_me: boolean;
  liker_names: string[];
  messages: { id: string; author_id: string; author_name: string | null; text: string; created_at: string }[];
};

/** Card + everything its page needs, in one query. Null if the viewer isn't in the circle. */
export async function findCardForMember(cardId: string, viewerId: string): Promise<CardDetail | null> {
  const [row] = await sql<CardDetail[]>`
    select c.*, au.name as author_name, m.role as viewer_role,
      w.text as wish_text, w.author_id as wish_author_id, w.visibility as wish_visibility,
      coalesce((select array_agg(v.user_id) from wish_viewers v where v.wish_id = w.id), '{}') as viewer_ids,
      coalesce((select array_agg(md.id order by md.created_at) from media md where md.card_id = c.id and md.kind = 'photo'), '{}') as photo_ids,
      (select count(*)::int from card_likes l where l.card_id = c.id) as like_count,
      exists (select 1 from card_likes l where l.card_id = c.id and l.user_id = ${viewerId}) as liked_by_me,
      coalesce((select array_agg(x.name) from (
        select u.name from card_likes l join users u on u.id = l.user_id
        where l.card_id = c.id and l.user_id <> ${viewerId} order by l.created_at desc limit 2) x), '{}') as liker_names,
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

export async function setLike(cardId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) await sql`insert into card_likes (card_id, user_id) values (${cardId}, ${userId}) on conflict do nothing`;
  else await sql`delete from card_likes where card_id = ${cardId} and user_id = ${userId}`;
}

export async function addMessage(card: Pick<CardDetail, "id" | "circle_id" | "wish_id" | "title">, authorId: string, text: string) {
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
    return row!;
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
