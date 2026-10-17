/**
 * Applies db/migrations/*.sql in filename order, each inside its own transaction.
 * Uses DIRECT_URL (session pooler / direct connection), falling back to DATABASE_URL.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(JSON.stringify({ level: "error", msg: "DIRECT_URL or DATABASE_URL must be set" }));
  process.exit(1);
}

const dir = path.join(process.cwd(), "db", "migrations");
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

async function main() {
  await sql`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )`;

  const applied = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

  let count = 0;
  for (const name of files) {
    if (applied.has(name)) continue;
    const body = await readFile(path.join(dir, name), "utf8");
    const started = Date.now();
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${name})`;
    });
    count++;
    console.log(JSON.stringify({ level: "info", msg: "migration applied", name, ms: Date.now() - started }));
  }
  console.log(JSON.stringify({ level: "info", msg: "migrations complete", applied: count, total: files.length }));
}

main()
  .catch((err: unknown) => {
    console.error(JSON.stringify({ level: "error", msg: "migration failed", error: String(err) }));
    process.exitCode = 1;
  })
  .finally(() => sql.end());
