import "server-only";
import { sql } from "@/lib/db/client";

export async function insertLoginCode(input: { contact: string; codeHash: string; nextPath: string | null; ttlMinutes: number }): Promise<void> {
  await sql`
    insert into login_codes (contact, code_hash, next_path, expires_at)
    values (${input.contact}, ${input.codeHash}, ${input.nextPath}, now() + make_interval(mins => ${input.ttlMinutes}))`;
}

export async function countRecentLoginCodes(contact: string, minutes: number): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from login_codes where contact = ${contact} and created_at > now() - make_interval(mins => ${minutes})`;
  return row?.n ?? 0;
}

export type LiveCode = { id: string; code_hash: string; next_path: string | null; attempts: number };

/** Unused, unexpired codes for this email or number, newest first (asking again doesn't cancel the earlier one). */
export async function liveLoginCodes(contact: string): Promise<LiveCode[]> {
  return sql<LiveCode[]>`
    select id, code_hash, next_path, attempts
    from login_codes where contact = ${contact} and used_at is null and expires_at > now()
    order by created_at desc limit 5`;
}

export async function recordWrongAttempt(id: string): Promise<void> {
  await sql`update login_codes set attempts = attempts + 1 where id = ${id}`;
}

/** Marks it used; false if someone else used it first. */
export async function spendLoginCode(id: string): Promise<boolean> {
  const rows = await sql`update login_codes set used_at = now() where id = ${id} and used_at is null returning id`;
  return rows.length > 0;
}
