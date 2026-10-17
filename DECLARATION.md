# Scope Honesty Declaration

Every feature in the spec appears in exactly one list. Nothing is described as partially working: anything not fully working is under **Not built**.

_Last updated: Phase 5 (rehearsal). Live at https://wish-circle-iota.vercel.app._

**Before you judge:**
- **Sign-in is in dev mode.** No verified email sender is set up yet, so the sign-in link is shown on screen instead of emailed. This also means anyone can sign in as any email address, including the demo accounts. It makes the demo easy to try; it is not production auth. Setting `RESEND_API_KEY` and a verified `EMAIL_FROM` switches to real email with no code change.
- Supabase’s free plan caps uploads at 50MB per file (photos are capped at 15MB anyway).
- `pnpm smoke` runs the whole demo loop below against the live URL with two people and the real AI. Last two runs: passed in 27s and 22s, with the live update reaching the other screen in 797 ms and 801 ms.

## Works live on the URL

**Accounts and circles**
- Sign in with an email magic link: single use, expires in 15 minutes, only a hash of the token stored. Sent by Resend when configured; otherwise shown on screen (see above).
- Optional password: set it from the Circle tab, then sign in with email and password.
- First-time name prompt (“What should the family call you?”).
- Create a circle: name, optional photo, mobility, planning notes, and “I am / someone setting it up for”. The photo is private and served through a membership check.
- Many circles per user, with a circle switcher on Home.
- Update mobility and notes from Home (owner and family).
- Invite by QR code or link, with the role chosen at invite time (family and friends, or care team doctor). Joining from the QR: sign in → name → join → circle home. The smoke test does this as a second person.
- Members list with roles.

**Wishes**
- Add a wish: text, one of six categories, and who can see it (everyone in the circle / only people I choose, with a member picker / just me for now).
- Change a wish (author only), including sharing a private wish later.
- Wishes tab: every wish the viewer may see.
- Visibility is enforced everywhere: in SQL for lists and in `lib/authz.ts` for single items. Private wishes are visible only to their author; chosen wishes only to the chosen people and the author. Cards, photos, plans, quests and feed items about a wish follow the wish’s visibility. A private wish leaves nothing in the feed, and anything you can’t see returns 404.
- “Talk it through”: a chat with gentle open questions from Claude Haiku 5.5.
  - It replies in the user’s language, with topic chips and voice input (Web Speech API, where the browser supports it).
  - When something concrete comes up, it shows a “This could be a wish” card with Save / Edit, which opens New wish prefilled.
  - The conversation is saved per person per circle, with “Start over”.

**Plans and quests**
- AI plans (Claude Sonnet 5.5): “Make a plan” turns a wish into a short plan plus 3-5 quests, fitted to the person’s mobility and the family’s notes.
  - A “Planning…” skeleton shows while it runs; if the AI fails, the wish stays and a retry appears.
  - Anything health-related carries a care-team flag on the plan and on each quest, shown as “Check with the care team first …”.
  - “Update plan” makes a new plan, keeps earlier plans as history, and carries every existing quest forward (open, in progress and done).
- Quests: “I’ll take this” → in progress, “Mark done”, “Let someone else take it”. Only the person who took a quest (or the owner) can finish or release it, and two people tapping at once can’t both get it.
- Quests on a private wish are locked (“Share this wish to let others help”) and unlock when the wish is shared.
- Activity feed (“See all” on Home): filters All / Quests / Cards / Wishes, grouped Today / Yesterday / by month in the viewer’s timezone, with “Show earlier” paging.
- Live updates: a quest claimed on one phone appears on another screen without a reload, measured at 361 to 801 ms on the live URL. Pages also refresh every 15 seconds as a fallback.

**Moments, cards and the book**
- “We did it, add moments”: up to 10 photos (JPG, PNG or WebP, up to 15MB each) plus a story.
  - The browser uploads straight to private Storage.
  - The server runs sharp on each photo: auto-rotate, fit within 2000px, re-encode as JPEG, which strips EXIF including GPS location.
  - Photos are stored at `<circleId>/<mediaId>.jpg`.
- AI cards (Claude Sonnet 5.5, reading the photos): a title and a 2-3 sentence body from the story and photos, in the author’s language.
  - A draft containing a banned word is rewritten once.
  - If the AI fails, the photos and words are kept and “Make the card” can be retried without re-uploading.
- Card reveal: spin-in, shine and sparkle, then “Add to the book” (the card flies into the book), “Change the words” (author only), “Open the card”, “Play again”. Respects reduced-motion settings.
- Card detail: photos, words, credit line (“Made from N photos and <name>’s story”), place and date, likes (with who liked it), messages to the person, and adding more photos.
- The book, which has no finished state:
  - Collection: six category slots. Filled slots show fanned covers and a count; empty slots show a gentle prompt and “Add a wish”.
  - Timeline: cards grouped by “Month · season”, with seasons for the southern hemisphere.
- Photos are only served through `GET /api/v1/media/:id`, which checks membership and visibility, then 302s to a 10-minute signed URL.

**Platform**
- `GET /api/health` runs a real `SELECT 1`.
- Every API route checks circle membership, validates input with zod, and returns `{ error: { code, message } }` without stack traces. Logs are structured JSON with a request id.
- Every AI call has a 20s timeout and retries with backoff, and logs model, tokens and latency. Sonnet calls use the server-side refusal fallback.
- `pnpm lint` includes the banned-word copy lint. `pnpm test` runs 75 tests (authz matrix, magic-link expiry and single use, quest states including `locked`, visibility and feed privacy, plan carry-forward, both hemispheres, photo pipeline, copy lint). `pnpm smoke` is the Playwright demo-loop test.

## Seeded for context

- The “Nana Rose” circle: Ploy (owner), Tom, Krit, Aunt May (family), Dr Lin (doctor). Tom is the second demo account for the two-browser check.
- Three wishes, two hand-written plans, and quests in mixed states (done, in progress, open, open needing the care team). New plans come from the AI.
- Two cards without photos, and activity items matching the design.

## Not built

- Voice notes and video (the “voice or video” part of Add moments isn’t shown).
- Card level-up (gold at 3+ contributors), and the “make it shine” chip from the design.
- Likes on individual messages (in the design, not in the spec’s data model).
- Memorial mode.
- PDF export and slideshow (no export button is shown).
- Choosing the hemisphere: every circle uses the southern hemisphere for seasons. The column exists, but there’s no setting.
- Notes from the care team on plans (the feed design shows “Dr Lin left a note”).
- Changing the circle’s photo or name after creation.
- CI running on GitHub: `.github/workflows/ci.yml` (lint incl. copy lint, tests on a throwaway Postgres, typecheck, build) is written, but the repo isn’t on GitHub yet. The same checks were run locally before each deploy.

## How it differs from the spec

- Live updates use a Supabase Realtime **broadcast** sent by a database trigger on `activity`, not `postgres_changes`.
  - The activity table is closed to the public key by row-level security, so `postgres_changes` would deliver nothing, or, if opened up, would expose every circle’s feed.
  - The broadcast carries no data; pages refetch through the signed-in API.
  - It still fires on commit of the same transaction that wrote the activity row.
- Pages are server-rendered and refresh with `router.refresh()` on each event, instead of invalidating React Query caches.
- Photos are uploaded straight from the browser to Storage (signed upload URLs), then resized by the server. Vercel caps request bodies at 4.5MB, which is too small for 10 photos of up to 15MB through a route handler.
- The card reveal uses the CSS keyframes from the design rather than framer-motion.
- Banned words: every system prompt forbids them, and card text is also checked by code and rewritten. Chat replies and plan text rely on the prompt alone.
- The smoke test creates its own circle on each run (and covers create circle and invite/join) instead of adding to Nana Rose’s circle, so the seeded demo stays clean.
