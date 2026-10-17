import "server-only";
import { sql } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import type { QuestRow, QuestStatus, Role, Visibility } from "@/lib/db/types";

export type QuestContext = QuestRow & {
  circle_id: string;
  wish_text: string;
  wish_author_id: string;
  wish_visibility: Visibility;
  viewer_role: Role;
  viewer_ids: string[];
};

/** The quest with its wish and the viewer's membership — null if the viewer isn't in the circle. */
export async function findQuestForMember(questId: string, userId: string): Promise<QuestContext | null> {
  const [row] = await sql<QuestContext[]>`
    select q.*, w.circle_id, w.text as wish_text, w.author_id as wish_author_id,
      w.visibility as wish_visibility, m.role as viewer_role,
      coalesce((select array_agg(v.user_id) from wish_viewers v where v.wish_id = w.id), '{}') as viewer_ids
    from quests q
    join wishes w on w.id = q.wish_id
    join memberships m on m.circle_id = w.circle_id and m.user_id = ${userId}
    where q.id = ${questId}`;
  return row ?? null;
}

/**
 * Moves a quest from `from` to `to`, only if it's still in `from` (so concurrent claims can't
 * both succeed), and writes the feed row in the same transaction. Returns null if it lost the race.
 */
export async function moveQuest(input: {
  quest: QuestContext;
  actorId: string;
  from: QuestStatus;
  to: QuestStatus;
  claimedBy: string | null;
}): Promise<QuestRow | null> {
  const { quest } = input;
  return sql.begin(async (tx) => {
    const [row] = await tx<QuestRow[]>`
      update quests set status = ${input.to}, claimed_by_user_id = ${input.claimedBy}, updated_at = now()
      where id = ${quest.id} and status = ${input.from}
      returning *`;
    if (!row) return null;
    const type = input.to === "done" ? "quest_done" : input.to === "in_progress" ? "quest_claimed" : null;
    if (type) {
      await insertActivity(tx, {
        circleId: quest.circle_id,
        actorId: input.actorId,
        type,
        wishId: quest.wish_id,
        refId: quest.id,
        payload: { title: quest.title, wish: quest.wish_text },
      });
    }
    return row;
  });
}
