import "server-only";
import { sql } from "@/lib/db/client";

export async function insertMagicLink(input: {
  tokenHash: string;
  email: string;
  nextPath: string | null;
  ttlMinutes: number;
}): Promise<void> {
  await sql`
    insert into magic_links (token_hash, email, next_path, expires_at)
    values (${input.tokenHash}, ${input.email}, ${input.nextPath},
            now() + make_interval(mins => ${input.ttlMinutes}))`;
}

/** Atomically marks the link used. Returns null if unknown, expired, or already used. */
export async function consumeMagicLink(tokenHash: string): Promise<{ email: string; next_path: string | null } | null> {
  const [row] = await sql<{ email: string; next_path: string | null }[]>`
    update magic_links set used_at = now()
    where token_hash = ${tokenHash} and used_at is null and expires_at > now()
    returning email, next_path`;
  return row ?? null;
}

/** How many links were requested for this email recently (simple rate limit). */
export async function countRecentMagicLinks(email: string, minutes: number): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from magic_links
    where email = ${email} and created_at > now() - make_interval(mins => ${minutes})`;
  return row?.n ?? 0;
}
