import "server-only";
import { sql } from "@/lib/db/client";
import type { UserRow } from "@/lib/db/types";

export async function findUserById(id: string): Promise<UserRow | null> {
  const [row] = await sql<UserRow[]>`select * from users where id = ${id}`;
  return row ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [row] = await sql<UserRow[]>`select * from users where email = ${email.toLowerCase()}`;
  return row ?? null;
}

export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const [row] = await sql<UserRow[]>`select * from users where phone = ${phone}`;
  return row ?? null;
}

/** Returns the existing user for this email or creates one. */
export async function upsertUserByEmail(email: string): Promise<UserRow> {
  const [row] = await sql<UserRow[]>`
    insert into users (email) values (${email.toLowerCase()})
    on conflict (email) do update set email = excluded.email
    returning *`;
  return row!;
}

export async function updateUserName(id: string, name: string): Promise<void> {
  await sql`update users set name = ${name} where id = ${id}`;
}

export async function setPasswordHash(id: string, hash: string): Promise<void> {
  await sql`update users set password_hash = ${hash} where id = ${id}`;
}
