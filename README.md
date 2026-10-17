# Wish Circle

A shared place for one person’s wishes, and the people who help make them happen. Family, friends and a doctor join a circle around one person, record wishes, plan them together, and keep memory cards in a shared book.

**Live:** https://wish-circle-iota.vercel.app · **What works, what’s seeded, what isn’t built:** [DECLARATION.md](DECLARATION.md)

Next.js 15 (App Router) · Postgres via raw SQL (`postgres.js`, no ORM) · Supabase (Postgres, Storage, Realtime) · Claude (Haiku 5.5 for chat, Sonnet 5.5 for plans and cards) · Vercel.

## Try it

The live site runs in **dev sign-in mode**: no email is sent, and the sign-in link appears on screen. Sign in with your own email to start a fresh circle, or use a seeded account to see the demo circle “Nana Rose”:

| Account | Role in Nana Rose’s circle |
|---|---|
| `ploy@wishcircle.demo` | Owner |
| `tom@wishcircle.demo` | Family (the second demo account) |
| `krit@wishcircle.demo`, `may@wishcircle.demo` | Family |
| `lin@wishcircle.demo` | Care team doctor |

**Live update across two browsers:**
1. Sign in as Ploy in one browser and as Tom in another (or in a private window).
2. Open the same wish, e.g. “Feel the sea breeze at Bondi”.
3. Tap “I’ll take this” as Tom. The quest flips to In progress on Ploy’s screen within about a second, with no reload.

**The demo loop:**
1. Sign in and open the circle.
2. Invite people (QR or link). They scan, sign in and join.
3. Add a wish, then tap Make a plan (AI).
4. Someone takes a quest, and the feed updates on every screen.
5. Tap “We did it, add moments”: add photos and a few words. The AI writes the card.
6. The card reveal plays, then the card goes into the book.

## Run locally (no Docker)

Needs Node 22 and pnpm 9.

```bash
pnpm install
```

```bash
cp .env.example .env
```

```bash
pnpm db:local
```

Then, in a second terminal:

```bash
pnpm migrate && pnpm seed && pnpm dev
```

`pnpm db:local` runs Postgres in-process via PGlite (port 54329). For a fully local setup, set in `.env`:

```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
DIRECT_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
DB_POOL_MAX=1
SESSION_SECRET=<openssl rand -base64 48>
ANTHROPIC_API_KEY=<your key>
```

To keep `pnpm migrate`/`seed` pointed at Supabase but run `pnpm dev` on PGlite, put the PGlite `DATABASE_URL` and `DB_POOL_MAX=1` in `.env.development.local` (Next.js loads it for `next dev` only). Photos need the Supabase Storage variables in either case. The Realtime trigger only exists on Supabase, so locally pages fall back to refreshing every 15 seconds.

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Supabase **transaction pooler** URL (port 6543). Used by the app. |
| `DIRECT_URL` | yes | Supabase **session pooler** URL (port 5432). Used by `pnpm migrate`/`seed`. Don’t use the direct `db.<ref>.supabase.co` host: it’s IPv6-only and Vercel builds are IPv4. |
| `SESSION_SECRET` | yes | ≥32 random chars; signs the session cookie. `openssl rand -base64 48` |
| `SUPABASE_URL` | yes | Project URL, `https://<ref>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key for Storage (uploads, signed URLs). Never sent to the browser. |
| `SUPABASE_ANON_KEY` | yes | Public key, used in the browser for direct photo uploads (signed upload URLs) and Realtime. |
| `ANTHROPIC_API_KEY` | yes | “Talk it through”, plans and card text. |
| `APP_URL` | optional | Public origin for links in emails and QR codes. Defaults to Vercel’s production domain. |
| `RESEND_API_KEY` | for email | Resend API key. |
| `EMAIL_FROM` | for email | e.g. `Wish Circle <hello@yourdomain>` (domain verified in Resend). Unset = dev sign-in mode. |
| `ANTHROPIC_MODEL` | optional | Override the plan/card model (default `claude-sonnet-5-5`). Chat always uses `claude-haiku-5-5`. |
| `DB_POOL_MAX` | local only | `1` for PGlite. Ignored on Vercel (always 1). |
| `TEST_DATABASE_URL` | tests | Database for DB-backed tests (local PGlite). Those tests are skipped when it’s unset, so they never touch the app database. |
| `AI_PROVIDER` | tests only | `mock` swaps in the deterministic `MockAiProvider`. Never set in production. |
| `SMOKE_BASE_URL` | smoke test | Where `pnpm smoke` runs (default: the live URL). |

## Deploy (Vercel + Supabase)

1. **Supabase**: create a project and a **private** Storage bucket named `media`. Copy the transaction pooler (6543) and session pooler (5432) connection strings, the project URL, and the anon and service-role keys.
2. **Vercel**: `pnpm dlx vercel link`, then add the env vars above (`vercel env add <NAME> production`), then `pnpm dlx vercel deploy --prod`. `vercel.json` runs `pnpm migrate && next build` and pins functions to `sin1` (next to a Singapore Supabase project; change it to match yours).
3. Seed once from your machine with the Supabase URLs in `.env`: `pnpm seed`. Re-running replaces only the demo circle.
4. Check: `curl https://<your-app>/api/health` returns `{"ok":true,"db":"ok",...}`, and `pnpm smoke` passes.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm migrate` | Applies new `db/migrations/*.sql` in order, each in a transaction (forward-only) |
| `pnpm seed` | Recreates the demo “Nana Rose” circle |
| `pnpm db:local` | Local Postgres via PGlite, no Docker |
| `pnpm test` | Vitest: authz matrix, quest state machine (incl. `locked`), magic-link expiry and single use, wish/card/media visibility, feed privacy, plan carry-forward, season grouping in both hemispheres, photo pipeline, copy lint |
| `pnpm lint` | ESLint, then copy lint: fails on “last”, “remaining”, “bucket list”, “deadline”, “countdown”, “streak” or “x of y” in `app/`, `components/`, `lib/ai/` |
| `pnpm smoke` | Playwright: the full demo loop against the live URL with two people and the real AI, including the under-2-second live update |

## How it fits together

- **Data:** `db/migrations/*.sql` (raw SQL, forward-only). Row types are hand-written in `lib/db/types.ts`. `lib/db/queries/*` holds one file per aggregate and is the only code that runs SQL, always as parameterised tagged templates. Every mutation writes its `activity` row in the same transaction.
- **Authorization:** `lib/authz.ts` holds pure rules (`canSeeWish`, `canSeeCard`, `canClaimQuest`, `canEditCircle`, `canSwitchMode`). List queries apply the same visibility rule in SQL (`lib/db/queries/visibility.ts`). Anything you can’t see returns 404.
- **Live updates:** a trigger on `activity` sends a data-free Supabase Realtime broadcast on `circle:<id>` when each transaction commits. Open pages call `router.refresh()` and refetch through the signed-in API. They also poll every 15s.
- **Photos:** the browser uploads straight to a private staging path through signed upload URLs. The server runs sharp on each photo (rotate, 2000px, strip EXIF/GPS) and stores `<circleId>/<mediaId>.jpg`. Reads go through `/api/v1/media/:id`, which checks membership and visibility, then 302s to a 10-minute signed URL.
- **AI:** `lib/ai/` holds the provider interface, the Anthropic provider (structured output, 20s timeout, backoff retries, per-call log of model, tokens and latency, server-side refusal fallback on Sonnet) and `MockAiProvider`. Every system prompt carries the care rules: no time limits or prognosis unless the user raises it, the banned words, check with the care team, reply in the user’s language.

## Scale: what breaks first at 10,000 users

The data layer is already Postgres plus object storage, scoped by circle with a membership check on every query.

1. **AI calls under burst.** Plans take about 5s and cards about 3s, synchronously inside a serverless function. Under load, move them to a queue (e.g. Inngest or a Supabase cron worker) with the existing “Planning…” state as the optimistic UI.
2. **Realtime fan-out per circle.** Fine at this scale, since circles are small. Beyond that, shard channels by circle id.
