import "server-only";
import { sql, type Tx } from "@/lib/db/client";
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
  | "card_created"
  | "card_message"
  | "card_levelled_up";

/** Always called with the mutation's transaction so the feed row commits with the change. */
export async function insertActivity(
  tx: Tx,
  a: { circleId: string; actorId: string | null; type: ActivityType; refId?: string | null; payload?: Record<string, unknown> },
): Promise<void> {
  await tx`
    insert into activity (circle_id, actor_id, type, ref_id, payload)
    values (${a.circleId}, ${a.actorId}, ${a.type}, ${a.refId ?? null}, ${tx.json((a.payload ?? {}) as never)})`;
}

export type ActivityItem = ActivityRow & { actor_name: string | null; actor_email: string | null };

/** Keyset-paginated feed for a circle, newest first. */
export async function listActivity(circleId: string, opts: { before?: Date; limit?: number } = {}): Promise<ActivityItem[]> {
  const limit = Math.min(opts.limit ?? 50, 50);
  return sql<ActivityItem[]>`
    select a.*, u.name as actor_name, u.email as actor_email
    from activity a left join users u on u.id = a.actor_id
    where a.circle_id = ${circleId}
      ${opts.before ? sql`and a.created_at < ${opts.before}` : sql``}
    order by a.created_at desc
    limit ${limit}`;
}
