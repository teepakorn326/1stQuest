import "server-only";
import { sql } from "@/lib/db/client";

export async function pingDb(): Promise<void> {
  await sql`select 1`;
}
