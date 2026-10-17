import "server-only";
import postgres from "postgres";
import { env } from "@/lib/env";

type Sql = postgres.Sql;

const globalForDb = globalThis as unknown as { __wcSql?: Sql };

function create(): Sql {
  return postgres(env().DATABASE_URL, {
    // Supabase's transaction pooler doesn't support prepared statements.
    prepare: false,
    // One connection per serverless instance; DB_POOL_MAX=1 also needed for local PGlite (single session).
    max: process.env.VERCEL ? 1 : Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    transform: { undefined: null },
  });
}

/** The single postgres.js client. Only `lib/db/queries/*` should import this. */
export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  get(_t, prop) {
    globalForDb.__wcSql ??= create();
    const value = Reflect.get(globalForDb.__wcSql, prop);
    return typeof value === "function" ? value.bind(globalForDb.__wcSql) : value;
  },
  apply(_t, _this, args) {
    globalForDb.__wcSql ??= create();
    return Reflect.apply(globalForDb.__wcSql as unknown as (...a: unknown[]) => unknown, undefined, args);
  },
});

export type Tx = postgres.TransactionSql;
