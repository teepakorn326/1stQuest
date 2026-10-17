import "server-only";
import type { Tx } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";

export const LEVEL_UP_CONTRIBUTORS = 3;

/**
 * Card level-up: once 3+ distinct members have contributed (made the card, added a photo,
 * voice note or video, or left a message), the card turns gold. Runs inside the contributing
 * transaction; the conditional update makes it fire exactly once. Returns true when it fired.
 */
export async function maybeLevelUp(tx: Tx, cardId: string): Promise<boolean> {
  const [row] = await tx<{ id: string; circle_id: string; wish_id: string | null; title: string }[]>`
    update cards c set level = 1
    where c.id = ${cardId} and c.level = 0
      and (
        select count(distinct who) from (
          select c.author_id as who
          union select m.uploader_id from media m where m.card_id = c.id
          union select cm.author_id from card_messages cm where cm.card_id = c.id
        ) contributors where who is not null
      ) >= ${LEVEL_UP_CONTRIBUTORS}
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
