import "server-only";
import { sql } from "@/lib/db/client";

/**
 * SQL condition: "the wish aliased as `w` is visible to this viewer" — same rule as
 * authz.canSeeWish. Use with a LEFT JOIN on wishes and `w.id is null or …` for rows
 * (cards) that may have no wish.
 */
export function wishVisibleTo(viewerId: string) {
  return sql`(
    w.author_id = ${viewerId}
    or w.visibility = 'circle'
    or (w.visibility = 'chosen' and exists (
          select 1 from wish_viewers v where v.wish_id = w.id and v.user_id = ${viewerId}))
  )`;
}
