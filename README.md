# Wish Circle

A shared place for one person’s wishes, and the people who help make them happen. Family, friends and a doctor join a circle around one person, record wishes, plan them together, and keep memory cards in a shared book.

Next.js 15 (App Router) · Postgres via raw SQL (`postgres.js`, no ORM) · Supabase (Postgres, Storage, Realtime) · Vercel.

What works today, what’s seeded, and what isn’t built yet: see [DECLARATION.md](DECLARATION.md).

## Run locally (no Docker)

Needs Node 22 and pnpm 9.

```bash
pnpm install
cp .env.example .env          # then fill in, see below
pnpm db:local                 # terminal 1: local Postgres (PGlite, port 54329)
pnpm migrate && pnpm seed     # terminal 2
pnpm dev                      # http://localhost:3000
```

For a local PGlite database, set in `.env`:

```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
DIRECT_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
DB_POOL_MAX=1
SESSION_SECRET=<openssl rand -base64 48>
```

Or point both URLs at your Supabase project instead (then drop `DB_POOL_MAX`).

With `EMAIL_FROM` unset, sign-in runs in **dev mode**: the sign-in link is shown on screen instead of emailed. Seeded accounts: `ploy@wishcircle.demo` (owner), `tom@`, `krit@`, `may@` (family), `lin@` (doctor).

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Supabase **transaction pooler** URL (port 6543). Used by the app. |
| `DIRECT_URL` | yes | Supabase **session pooler** URL (port 5432). Used by `pnpm migrate`/`seed`. Don’t use the direct `db.<ref>.supabase.co` host: it’s IPv6-only and Vercel builds are IPv4. |
| `SESSION_SECRET` | yes | ≥32 random chars; signs the session cookie. `openssl rand -base64 48` |
| `APP_URL` | yes | Public origin, no trailing slash. Used in sign-in and invite links. |
| `SUPABASE_URL` | for photos | Project URL (Settings → API). |
| `SUPABASE_SERVICE_ROLE_KEY` | for photos | Server-only key for Storage uploads and signed URLs. Never exposed to the browser. |
| `SUPABASE_ANON_KEY` | Phase 3 | Public key for Realtime subscriptions. |
| `RESEND_API_KEY` | for email | Resend API key. |
| `EMAIL_FROM` | for email | e.g. `Wish Circle <hello@yourdomain>` (domain verified in Resend). Unset = dev mode. |
| `ANTHROPIC_API_KEY` | Phase 2 | For “Talk it through”, plans and card text. |
| `DB_POOL_MAX` | local only | `1` for PGlite. Ignored on Vercel (always 1). |

## Deploy (Vercel + Supabase)

1. **Supabase**: create a project. In Storage, create a **private** bucket named `media`. From Settings → Database → Connection string, copy the transaction pooler (6543) and session pooler (5432) URLs. From Settings → API, copy the project URL and service-role key.
2. **GitHub**: push this repo.
3. **Vercel**: import the repo. Framework is detected; `vercel.json` sets the build command to `pnpm vercel-build`, which runs `pnpm migrate` and then `next build`. Add the env vars above (set `APP_URL` to the Vercel URL). Node.js version: 22.x.
4. Deploy, then seed once from your machine with the Supabase URLs in `.env`: `pnpm seed`.
5. Smoke check: `curl https://<your-app>/api/health` returns `{"ok":true,"db":"ok",...}`.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm migrate` | Applies new `db/migrations/*.sql` in order, each in a transaction (forward-only) |
| `pnpm seed` | Recreates the demo “Nana Rose” circle |
| `pnpm db:local` | Local Postgres via PGlite, no Docker |
| `pnpm test` | Vitest: authz matrix, cookies, passwords, copy lint, magic links (DB) |
| `pnpm lint` | ESLint + copy lint (banned words in `app/`, `components/`, `lib/ai/`) |

## Layout

- `db/migrations/` SQL migrations · `lib/db/types.ts` hand-written row types · `lib/db/queries/` one file per aggregate (only place that runs SQL)
- `lib/authz.ts` pure permission rules · `lib/auth/` sessions, magic links, passwords · `lib/http.ts` route wrapper (request id, JSON logs, `{ error: { code, message } }`)
- `app/api/v1/**` route handlers · `app/(app)/**` signed-in screens · `app/(auth)/**` sign-in
