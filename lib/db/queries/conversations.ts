import "server-only";
import { sql } from "@/lib/db/client";
import type { Category, ConversationMessageRow } from "@/lib/db/types";

/** The user's conversation in this circle, created with an opening question if new. */
export async function ensureConversation(circleId: string, userId: string, opener: string): Promise<string> {
  return sql.begin(async (tx) => {
    const [conv] = await tx<{ id: string }[]>`
      insert into conversations (circle_id, user_id) values (${circleId}, ${userId})
      on conflict (circle_id, user_id) do update set circle_id = excluded.circle_id
      returning id`;
    const [count] = await tx<{ n: number }[]>`
      select count(*)::int as n from conversation_messages where conversation_id = ${conv!.id}`;
    if (count?.n === 0) {
      await tx`insert into conversation_messages (conversation_id, role, content) values (${conv!.id}, 'assistant', ${opener})`;
    }
    return conv!.id;
  });
}

export async function listConversationMessages(conversationId: string, limit = 60): Promise<ConversationMessageRow[]> {
  return sql<ConversationMessageRow[]>`
    select * from (
      select * from conversation_messages where conversation_id = ${conversationId}
      order by created_at desc limit ${limit}
    ) m order by created_at asc`;
}

/** Stores the user's message and the assistant's reply together. */
export async function appendTurn(
  conversationId: string,
  userText: string,
  reply: { content: string; suggestion: { text: string; category: Category } | null },
): Promise<ConversationMessageRow> {
  return sql.begin(async (tx) => {
    await tx`insert into conversation_messages (conversation_id, role, content) values (${conversationId}, 'user', ${userText})`;
    const [row] = await tx<ConversationMessageRow[]>`
      insert into conversation_messages (conversation_id, role, content, suggestion, created_at)
      values (${conversationId}, 'assistant', ${reply.content},
              ${reply.suggestion ? tx.json(reply.suggestion as never) : null}, clock_timestamp())
      returning *`;
    return row!;
  });
}

/** "Start over": clears the messages; the next ensureConversation adds a fresh opener. */
export async function clearConversation(circleId: string, userId: string): Promise<void> {
  await sql`
    delete from conversation_messages where conversation_id in
      (select id from conversations where circle_id = ${circleId} and user_id = ${userId})`;
}
