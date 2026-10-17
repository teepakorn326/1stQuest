import "server-only";
import { sql } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import { maybeLevelUp } from "@/lib/db/queries/levels";
import { wishVisibleTo } from "@/lib/db/queries/visibility";
import type { MediaKind, MediaRow } from "@/lib/db/types";

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
  kind?: MediaKind;
  durationSec?: number | null;
}): Promise<MediaRow> {
  const [row] = await sql<MediaRow[]>`
    insert into media (id, circle_id, uploader_id, kind, path, mime_type, bytes, duration_sec)
    values (${m.id}, ${m.circleId}, ${m.uploaderId}, ${m.kind ?? "photo"}, ${m.path}, ${m.mimeType}, ${m.bytes}, ${m.durationSec ?? null})
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
}): Promise<{ added: number; levelledUp: boolean }> {
  return sql.begin(async (tx) => {
    const rows = await tx<{ id: string; kind: MediaKind }[]>`
      update media set card_id = ${input.cardId}
      where circle_id = ${input.circleId} and uploader_id = ${input.actorId}
        and card_id is null and id = any(${input.mediaIds}::uuid[])
      returning id, kind`;
    const photos = rows.filter((r) => r.kind === "photo");
    if (photos.length > 0) {
      await tx`update cards set cover_media_id = coalesce(cover_media_id, ${photos[0]!.id}) where id = ${input.cardId}`;
    }
    if (rows.length > 0) {
      const recordings = rows.filter((r) => r.kind !== "photo");
      await insertActivity(tx, {
        circleId: input.circleId,
        actorId: input.actorId,
        type: photos.length ? "photos_added" : "recording_added",
        wishId: input.wishId,
        refId: input.cardId,
        payload: { count: photos.length, kind: recordings[0]?.kind ?? null, wish: input.wishText ?? input.cardTitle },
      });
    }
    return { added: rows.length, levelledUp: rows.length > 0 && (await maybeLevelUp(tx, input.cardId)) };
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

export type MediaForViewer = { id: string; kind: MediaKind; card_id: string | null; card_title: string | null; uploader_name: string | null };

/** A media item plus its card, if this viewer may see it (same rule as findMediaPathForMember). */
export async function findMediaForMember(mediaId: string, viewerId: string): Promise<MediaForViewer | null> {
  const [row] = await sql<MediaForViewer[]>`
    select m.id, m.kind, m.card_id, c.title as card_title, u.name as uploader_name
    from media m
    join memberships mem on mem.circle_id = m.circle_id and mem.user_id = ${viewerId}
    left join cards c on c.id = m.card_id
    left join wishes w on w.id = c.wish_id
    left join users u on u.id = m.uploader_id
    where m.id = ${mediaId}
      and (
        (m.card_id is null and m.uploader_id = ${viewerId})
        or (m.card_id is not null and (w.id is null or ${wishVisibleTo(viewerId)}))
      )`;
  return row ?? null;
}
