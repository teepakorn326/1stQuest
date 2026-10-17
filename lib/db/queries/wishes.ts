import "server-only";
import { sql } from "@/lib/db/client";
import type { Category, QuestStatus, Visibility } from "@/lib/db/types";

export type WishSummary = {
  id: string;
  text: string;
  category: Category;
  visibility: Visibility;
  created_at: Date;
  open_quests: number;
  /** Most recently updated in-progress quest, for "Tom is booking transport". */
  active_quest: { title: string; status: QuestStatus; claimer_name: string | null } | null;
};

/**
 * Wishes in a circle the viewer may see (same rule as authz.canSeeWish), with quest
 * summary, in a single query.
 */
export async function listVisibleWishes(circleId: string, userId: string, limit = 20): Promise<WishSummary[]> {
  return sql<WishSummary[]>`
    select w.id, w.text, w.category, w.visibility, w.created_at,
      coalesce(q.open_quests, 0)::int as open_quests,
      aq.active_quest
    from wishes w
    left join lateral (
      select count(*) filter (where status = 'open') as open_quests from quests where wish_id = w.id
    ) q on true
    left join lateral (
      select json_build_object('title', qq.title, 'status', qq.status, 'claimer_name', u.name) as active_quest
      from quests qq left join users u on u.id = qq.claimed_by_user_id
      where qq.wish_id = w.id and qq.status = 'in_progress'
      order by qq.updated_at desc limit 1
    ) aq on true
    where w.circle_id = ${circleId}
      and (
        w.author_id = ${userId}
        or w.visibility = 'circle'
        or (w.visibility = 'chosen' and exists (select 1 from wish_viewers v where v.wish_id = w.id and v.user_id = ${userId}))
      )
    order by w.created_at desc
    limit ${limit}`;
}
