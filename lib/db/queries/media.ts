import "server-only";
import { sql } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import { wishVisibleTo } from "@/lib/db/queries/visibility";
import type { MediaRow } from "@/lib/db/types";

export async function findMediaByIds(circleId: string, ids: string[]): Promise<MediaRow[]> {
  if (ids.length === 0) return [];
  return sql<MediaRow[]>`select * from media where circle_id = ${circleId} and id = any(${ids}::uuid[])`;
}

export async function insertMedia(m: {
  id: string;
  circleId: string;
  uploaderId: string;
  path: string;
  mimeType: string;
  bytes: number;
}): Promise<MediaRow> {
  const [row] = await sql<MediaRow[]>`
    insert into media (id, circle_id, uploader_id, kind, path, mime_type, bytes)
    values (${m.id}, ${m.circleId}, ${m.uploaderId}, 'photo', ${m.path}, ${m.mimeType}, ${m.bytes})
    on conflict (id) do update set id = excluded.id
    returning *`;
  return row!;
}

/** Attaches already-processed photos to a card and posts "added N photos" to the feed. */
export async function attachPhotosToCard(input: {
  cardId: string;
  circleId: string;
  wishId: string | null;
  wishText: string | null;
  cardTitle: string;
  actorId: string;
  mediaIds: string[];
}): Promise<number> {
  return sql.begin(async (tx) => {
    const rows = await tx`
      update media set card_id = ${input.cardId}
      where circle_id = ${input.circleId} and uploader_id = ${input.actorId}
        and card_id is null and id = any(${input.mediaIds}::uuid[])
      returning id`;
    if (rows.length > 0) {
      await tx`update cards set cover_media_id = coalesce(cover_media_id, ${rows[0]!.id}) where id = ${input.cardId}`;
      await insertActivity(tx, {
        circleId: input.circleId,
        actorId: input.actorId,
        type: "photos_added",
        wishId: input.wishId,
        refId: input.cardId,
        payload: { count: rows.length, wish: input.wishText ?? input.cardTitle },
      });
    }
    return rows.length;
  });
}

/**
 * Storage path for a media item, if this viewer may see it: on a card, the card's wish must be
 * visible to them; not yet on a card, only the uploader.
 */
export async function findMediaPathForMember(mediaId: string, viewerId: string): Promise<string | null> {
  const [row] = await sql<{ path: string }[]>`
    select m.path from media m
    join memberships mem on mem.circle_id = m.circle_id and mem.user_id = ${viewerId}
    left join cards c on c.id = m.card_id
    left join wishes w on w.id = c.wish_id
    where m.id = ${mediaId}
      and (
        (m.card_id is null and m.uploader_id = ${viewerId})
        or (m.card_id is not null and (w.id is null or ${wishVisibleTo(viewerId)}))
      )`;
  return row?.path ?? null;
}
