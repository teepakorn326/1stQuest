import "server-only";
import { sql, type Tx } from "@/lib/db/client";
import { wishVisibleTo } from "@/lib/db/queries/visibility";
import type { ActivityRow } from "@/lib/db/types";

export type ActivityType =
  | "circle_created"
  | "member_joined"
  | "mobility_updated"
  | "wish_added"
  | "plan_generated"
  | "quest_claimed"
  | "quest_done"
  | "photos_added"
  | "recording_added"
  | "card_created"
  | "card_message"
  | "card_levelled_up";

export const FEED_FILTERS = {
  all: null,
  quests: ["quest_claimed", "quest_done", "plan_generated"],
  cards: ["photos_added", "recording_added", "card_created", "card_message", "card_levelled_up"],
  wishes: ["wish_added", "plan_generated"],
} as const satisfies Record<string, readonly ActivityType[] | null>;
export type FeedFilter = keyof typeof FEED_FILTERS;

/**
 * Always called with the mutation's transaction so the feed row commits with the change.
 * Rows about a wish carry wishId so the feed can hide them from people who can't see the wish.
 */
export async function insertActivity(
  tx: Tx,
  a: {
    circleId: string;
    actorId: string | null;
    type: ActivityType;
    wishId?: string | null;
    refId?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await tx`
    insert into activity (circle_id, actor_id, type, wish_id, ref_id, payload)
    values (${a.circleId}, ${a.actorId}, ${a.type}, ${a.wishId ?? null}, ${a.refId ?? null},
            ${tx.json((a.payload ?? {}) as never)})`;
}

export type ActivityItem = ActivityRow & { actor_name: string | null; actor_email: string | null };

/**
 * The circle's feed as this viewer may see it (same wish-visibility rule as authz.canSeeWish),
 * newest first, keyset-paginated on created_at.
 */
export async function listActivity(
  circleId: string,
  viewerId: string,
  opts: { before?: Date; limit?: number; filter?: FeedFilter } = {},
): Promise<ActivityItem[]> {
  const limit = Math.min(opts.limit ?? 50, 50);
  const types = opts.filter ? FEED_FILTERS[opts.filter] : null;
  return sql<ActivityItem[]>`
    select a.*, u.name as actor_name, u.email as actor_email
    from activity a
    left join users u on u.id = a.actor_id
    left join wishes w on w.id = a.wish_id
    where a.circle_id = ${circleId}
      and (a.wish_id is null or ${wishVisibleTo(viewerId)})
      ${types ? sql`and a.type = any(${types as unknown as string[]})` : sql``}
      ${opts.before ? sql`and a.created_at < ${opts.before}` : sql``}
    order by a.created_at desc
    limit ${limit}`;
}
