# Scope Honesty Declaration

Every feature in the spec appears in exactly one list. Nothing is described as partially working; a feature not fully working is under **Not built**. Updated at the end of each phase.

_Last updated: Phase 4 (moments, cards, the book), deployed at https://wish-circle-iota.vercel.app._

Right now the live site has no verified email sender, so sign-in uses the on-screen dev link. Supabase’s free plan caps uploads at 50MB per file.

## Works live on the URL

- Sign in with an email magic link (single use, expires in 15 minutes). Sent by Resend when `EMAIL_FROM` is set; otherwise the link is shown on screen under a “Dev mode” banner.
- Optional password: set it from the Circle tab, then sign in with email and password.
- First-time name prompt (“What should the family call you?”).
- Create a circle: name, optional photo (stored in the private Supabase `media` bucket, served through a membership check and a 10-minute signed URL), mobility, planning notes, and “I am / someone setting it up for”.
- Many circles per user, with a circle switcher on Home.
- Update mobility and notes from Home (owner and family).
- Invite by QR code or link, with the role chosen at invite time (family and friends, or care team doctor). Joining from the QR: sign-in → name → join → circle home.
- Members list with roles.
- Home: greeting, mobility card, wishes the viewer is allowed to see (private and chosen visibility enforced in SQL) with quest summaries, and the three newest activity items.
- Activity rows written in the same transaction as each change (circle created, member joined, mobility updated).
- Add a wish: text, one of six categories, and who can see it (everyone in the circle / only people I choose, with a member picker / just me for now).
- Change a wish (author only), including sharing a private wish later.
- Wishes tab: every wish the viewer may see.
- AI plans (Claude Sonnet 5.5): “Make a plan” turns a wish into a short plan plus 3-5 quests, fitted to the person’s mobility and the family’s notes. A “Planning…” skeleton shows while it runs; if the AI fails, the wish stays and a retry appears. Anything health-related carries a care-team flag on the plan and on each quest, shown as “Check with the care team first …”. “Update plan” makes a new plan, keeps earlier plans as history, and carries every existing quest forward (open, in progress and done) so nothing is lost.
- Quests: “I’ll take this” → in progress, “Mark done”, “Let someone else take it”. Only the person who took it (or the owner) can finish or release it, and two people tapping at once can’t both get it. Quests on a private wish are locked (“Share this wish to let others help”) and unlock when the wish is shared.
- Activity feed (“See all” on Home): filters All / Quests / Cards / Wishes, grouped Today / Yesterday / by month in the viewer’s timezone, “Show earlier” paging. Feed items about a wish follow that wish’s visibility.
- Live updates: a quest claimed on one phone appears on another screen without a reload (measured at 361 ms on the live URL). Every activity row triggers a data-free Supabase Realtime broadcast on the circle’s channel, and open pages refetch. Pages also refresh every 15 seconds as a fallback.
- Visibility enforced everywhere: private wishes are only visible to their author; chosen wishes only to the chosen people and the author. A private wish leaves nothing in the activity feed, and a chosen wish appears there without its text.
- “Talk it through”: a chat with gentle open questions from Claude Haiku 5.5. It replies in the user’s language, and offers topic chips and voice input (Web Speech API, where the browser supports it). When something concrete comes up it shows a “This could be a wish” card with Save / Edit, which opens New wish prefilled. The conversation is saved per person per circle, with “Start over”.
- AI calls: 20s timeout, retries with backoff, and a log line per call (model, tokens, latency). If the AI fails, the person’s message stays in the box with a retry message.
- “We did it, add moments”: up to 10 photos (JPG, PNG or WebP, up to 15MB each) plus a story.
  - Photos go from the browser straight to a private Supabase Storage staging folder through one-time signed upload URLs. The server then runs sharp on each one: auto-rotate, fit within 2000px, re-encode as JPEG (which strips EXIF, including GPS location). The result is stored at `<circleId>/<mediaId>.jpg` and the original is deleted.
- AI cards (Claude Sonnet 5.5, with image input): writes a title and a 2-3 sentence body from the story and photos, in the author’s language. It never uses the banned words: a draft that does is rewritten once. If the AI fails, the photos and words are kept and “Make the card” can be retried without re-uploading.
- Card reveal: spin-in, shine and sparkle, “Add to the book” (the card flies into the book), “Change the words” (author only), “Open the card”, “Play again”. Respects reduced-motion settings.
- Card detail: photos, words, credit line (“Made from N photos and <name>’s story”), place and date, likes (who liked it), messages to the person, and adding more photos.
- The book: Collection (six category slots; filled slots show fanned covers and a count; empty slots show a gentle prompt and “Add a wish”) and Timeline (cards grouped by “Month · season”, seasons from the circle’s hemisphere, south by default). The book has no finished state.
- Photos are served only through `GET /api/v1/media/:id`: membership and card visibility are checked, then a 302 to a 10-minute signed URL. Cards and their photos follow their wish’s visibility.
- `GET /api/health` runs a real `SELECT 1`.
- Authorization: every API route checks circle membership; other circles return 404.

## Seeded for context

- The “Nana Rose” circle: Ploy (owner), Tom, Krit, Aunt May (family), Dr Lin (doctor).
- Three wishes, two plans, quests in mixed states (done, in progress, open, open needing the care team). The two seeded plans were written by hand; new plans come from the AI.
- Two cards (text only, no photos), and activity items matching the design.
- The two seeded cards have no photos.

## Not built

- Voice notes and video (the “voice or video” part of Add moments isn’t shown yet).
- Card level-up (gold at 3+ contributors).
- Memorial mode.
- PDF export and slideshow.
- Playwright smoke test of the demo loop.

## How it differs from the spec

- Live updates use a Supabase Realtime *broadcast* sent by a database trigger on `activity`, not `postgres_changes`. The activity table is closed to the public key by row-level security, so `postgres_changes` would deliver nothing (or, if opened up, would expose every circle’s feed). The broadcast carries no data; pages refetch through the signed-in API. It still fires on commit of the same transaction that wrote the activity row.
- Pages are server-rendered and refresh with `router.refresh()` on each event, instead of invalidating React Query caches.
- Photos are uploaded straight from the browser to Storage (signed upload URLs), then resized by the server, because Vercel caps request bodies at 4.5MB, too small for 10 photos of up to 15MB each through a route handler.
- The card reveal uses the CSS keyframes from the design rather than framer-motion.
