import "server-only";
import { sql } from "@/lib/db/client";
import type { UserRow } from "@/lib/db/types";

export const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
  const [row] = await sql<{ id: string; expires_at: Date }[]>`
    insert into sessions (user_id, expires_at)
    values (${userId}, now() + make_interval(days => ${SESSION_TTL_DAYS}))
    returning id, expires_at`;
  return { id: row!.id, expiresAt: row!.expires_at };
}

/** Valid (unexpired) session joined to its user, in one query. */
export async function findSessionUser(sessionId: string): Promise<UserRow | null> {
  const [row] = await sql<UserRow[]>`
    select u.* from sessions s join users u on u.id = s.user_id
    where s.id = ${sessionId} and s.expires_at > now()`;
  return row ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sql`delete from sessions where id = ${sessionId}`;
}
