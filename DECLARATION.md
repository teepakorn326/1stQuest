# Scope Honesty Declaration

Every feature in the spec appears in exactly one list. Nothing is described as partially working; a feature not fully working is under **Not built**. Updated at the end of each phase.

_Last updated: Phase 2 (wishes), deployed at https://wish-circle-iota.vercel.app._

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
- Wishes tab: every wish the viewer may see. Wish detail shows the latest plan and its quests (read-only), and the “Check with the care team first” callout when the plan is flagged.
- Visibility enforced everywhere: private wishes are only visible to their author; chosen wishes only to the chosen people and the author. A private wish leaves nothing in the activity feed, and a chosen wish appears there without its text.
- “Talk it through”: a chat with gentle open questions from Claude Haiku 5.5. It replies in the user’s language, and offers topic chips and voice input (Web Speech API, where the browser supports it). When something concrete comes up it shows a “This could be a wish” card with Save / Edit, which opens New wish prefilled. The conversation is saved per person per circle, with “Start over”.
- AI calls: 20s timeout, retries with backoff, and a log line per call (model, tokens, latency). If the AI fails, the person’s message stays in the box with a retry message.
- `GET /api/health` runs a real `SELECT 1`.
- Authorization: every API route checks circle membership; other circles return 404.

## Seeded for context

- The “Nana Rose” circle: Ploy (owner), Tom, Krit, Aunt May (family), Dr Lin (doctor).
- Three wishes, two plans, quests in mixed states (done, in progress, open, open needing the care team). The plans are seeded; generating them is Phase 3.
- Two cards (text only, no photos), and activity items matching the design.
- Seeded plans, quests and cards are real database rows. The screens that create them aren’t built yet (see below).

## Not built

- AI plan generation, “Update plan”, the care-team callout on plans and quests.
- Quest claim and done, locked quests on private wishes.
- Full activity feed screen with filters and Today / Yesterday grouping.
- Live updates via Supabase Realtime, and the 15-second polling fallback.
- Add moments (photo upload, resizing, story), AI card text, card reveal animation.
- Card detail: likes, messages, more photos.
- The book: Collection and Timeline views. The Book tab says so.
- Voice notes and video.
- Card level-up (gold at 3+ contributors).
- Memorial mode.
- PDF export and slideshow.
- Playwright smoke test of the demo loop.
