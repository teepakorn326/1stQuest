# Load test (18 Oct 2026)

Run against a **preview deployment on a separate Supabase free-tier project** (Singapore), never production.
Same code, same Vercel region (`sin1`) and same Supabase plan as production. No email, SMS or AI keys on the
preview, so nothing real was sent and the AI was mocked (AI calls weren't load-tested).

## Setup
- 65 circles, 650 signed-in fake users (owner, caretaker, 8 viewers per circle), 3 wishes with a plan and
  4 quests each, 3 cards with 2 photos and 3 messages each (`scripts/loadtest/seed.mjs`, `sessions.mjs`).
- Each virtual user loops like a real person, with no pause between requests (much harder than real use):
  Home → Book → a wish → a card → one of its photos, and posts a comment every 5th loop (`scripts/loadtest/run.mjs`).
- 30 seconds per step, from a laptop in Australia.

## Results: pages and API

| Users at once | Requests/s | Median | p95 | p99 | Errors |
|---:|---:|---:|---:|---:|---:|
| 10 | 24 | 440 ms | 572 ms | 696 ms | 0% |
| 25 | 56 | 455 ms | 615 ms | 765 ms | 0% |
| 50 | 96 | 483 ms | 956 ms | 1.2 s | 0% |
| 100 | 103 | 519 ms | 3.2 s | 3.5 s | 0% |
| 200 | 153 | 534 ms | 4.4 s | 5.7 s | 0% |
| 400 | 281 | 577 ms | 5.0 s | 7.5 s | 0% |

- **No request failed**, up to 400 users hammering at once (11,776 requests in 30 s at the top step).
- The median stayed around 500 ms all the way. The tail grew: from 100 users, the slowest 5% of the
  heaviest pages (Home and Book, which run several queries each) took 3–7 s. Photos (redirect to a signed
  URL) and posting a comment stayed fast (p95 about 0.3–0.5 s) at every step.
- With no pause between clicks, 400 virtual users is roughly 2,000–4,000 real people using the app at the
  same moment (real people read for 5–20 s between taps).

## Results: live updates (Supabase Realtime)

| Connections opened | Connected |
|---:|---:|
| 300 (1st run) | 300 |
| 300 (2nd run) | 285 |

- Live-update connections top out at about **285–300 open at once** on the free plan. Past that, phones
  miss the instant update but the pages still refresh every 15 seconds (polling fallback), so nothing breaks.

## What breaks first, measured
1. **Live updates at ~300 phones with the app open at once** (Supabase free plan). Fix: Supabase Pro (higher
   connection quota), or one shared connection per browser tab group.
2. **Page tail latency from ~100 non-stop users.** Home and Book slow down first (3–7 s for the slowest 5%).
   Fixes: fewer queries per page (one query for Home), caching the book, a bigger database than the free
   60-connection instance, and read replicas.
3. **Not tested:** AI calls (mocked here). From experience these break before everything above (rate limits,
   about 10 s each); they'd move to a job queue.
