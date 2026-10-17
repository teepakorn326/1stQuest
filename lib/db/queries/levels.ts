import "server-only";
import type { Tx } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";

/**
 * Card level-up: the card turns gold when it gets its first comment (from anyone). Photos and
 * voice notes alone don't. Runs inside the contributing transaction; the conditional update
 * makes it fire exactly once. Returns true when it fired.
 */
export async function maybeLevelUp(tx: Tx, cardId: string): Promise<boolean> {
  const [row] = await tx<{ id: string; circle_id: string; wish_id: string | null; title: string }[]>`
    update cards c set level = 1
    where c.id = ${cardId} and c.level = 0
      and exists (select 1 from card_messages cm where cm.card_id = c.id)
    returning c.id, c.circle_id, c.wish_id, c.title`;
  if (!row) return false;
  await insertActivity(tx, {
    circleId: row.circle_id,
    actorId: null,
    type: "card_levelled_up",
    wishId: row.wish_id,
    refId: row.id,
    payload: { title: row.title },
  });
  return true;
}
