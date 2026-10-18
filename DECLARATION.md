# Scope Honesty Declaration

Every feature in the spec appears in exactly one list. Nothing is described as partially working: anything not fully working is under **Not built**.

_Last updated: after the 17 Oct smoke test (1stQuest name and amber design, owner-only posting, comments instead of likes, gold animation, microphone on New wish, card share links, notifications by app and text), then voice-only recordings with the design’s waveform player and a mobile number on Welcome. Live at https://1stquest.vercel.app._

**Before you judge:**
- **Text messages are in dev mode.** ClickSend isn’t configured yet, so texts are prepared and logged, not sent. Setting `CLICKSEND_USERNAME` and `CLICKSEND_API_KEY` (and optionally `CLICKSEND_FROM`) turns them on with no code change.
- **Email sign-in is in dev mode.** No verified email sender is set up yet, so the 6-digit sign-in code is shown on screen instead of emailed. This also means anyone can sign in as any email address, including the demo accounts. (Codes by text message are real: ClickSend is configured in production.) It makes the demo easy to try; it is not production auth. Setting `RESEND_API_KEY` and a verified `EMAIL_FROM` switches to real email with no code change.
- `pnpm smoke` runs the whole demo loop below against the live URL with two people and the real AI. Last two runs: passed in 27s and 22s, with the live update reaching the other screen in 797 ms and 801 ms.

## Works live on the URL

**Accounts and circles**
- Sign in with a 6-digit code sent to your email or mobile number (replaced the magic link after the 18 Oct feedback). Codes work once, expire in 10 minutes (asking again doesn’t cancel an earlier code), allow 5 wrong tries, and at most 5 can be requested per address every 15 minutes. Only a keyed hash is stored. A new email creates an account, but texts only go to a number already on an account (one a caretaker added, or one saved from Welcome/Circle); a number can belong to one account only. Old magic links still work until they expire.
- Every email and mobile-number field is checked the same way in the browser (a message under the field when you leave it or submit) and on the server. Emails need a real-looking address. Mobile numbers are checked against the chosen country’s mobile formats with `libphonenumber-js` (a Thai mobile has 9 digits after +66 and starts with 6, 8 or 9; landlines are refused), then stored in international format.
- Optional password: set it from the Circle tab, then sign in with email and password.
- Sign out shows “Signing out…” and ignores repeat taps, then loads the sign-in page fresh. Before, a slow first response made people tap again, so it looked like it took more than one try.
- First-time name prompt (“What should the family call you?”).
- Four roles (18 Oct feedback): **owner** (the person the circle is for), **caretaker** (sets it up, posts, manages people), **viewer** (reads, comments, takes quests) and **health professional** (same as a viewer, labelled so the family knows who’s from the care side; migration `0010`). Whoever signs up first is a caretaker. Migration `0008` turned each existing circle’s owner (the person who set it up) into a caretaker, and family and care team into viewers.
- Create a circle (caretaker): the person’s photo, name, email and (optional) mobile number, plus mobility and planning notes. This makes that person’s own account, and they are the circle’s owner. The photo is private and served through a membership check.
- Home (the “Circle home” design): a greeting card with your name and role chip (Owner, Caretaker, Viewer, or Trusted person), then the circle drawn as a book with the person’s photo or initial, “Owner · <name>” and “<name>’s circle”. With more than one circle, tapping the book opens a list to switch circles (and start another). Then getting around, Add a wish, wishes and the latest activity.
- Update mobility and notes from Home (owner and caretakers).
- Invite people (Circle → Invite people): each circle has one link and QR code. Whoever opens it registers there with their name, email, optional mobile number and “Family or a friend” / “A health professional”, confirms with an emailed code, and is in. Someone already signed in just picks and joins. In the list, the owner or a caretaker can make someone a caretaker (or a viewer again) or remove them; the owner can’t be changed or removed. (A short-lived version had caretakers type everyone’s details in; that was replaced by registering from the link.) The smoke test does this as a second person.
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
- Card detail: photos (clipped to their frame, so tall photos never cover the words), words, credit line (“Made from N photos and <name>’s story”), place and date, and messages to the person. There are no likes: comments are how people show love.
- Only the owner and caretakers post: wishes, plans, Talk it through, cards, memories, photos and voice notes. Viewers read, comment and take quests. Posting controls are hidden from them, and the API refuses with 403.
- Done wishes: when every quest in a wish’s plan is done, the wish is done. It shows greyed out with a check and “Done · every quest is complete”, moves to the bottom of the wish lists, and becomes read-only: its plan can’t be updated and its words can’t be changed (the API refuses with 409 `wish_done`). Moments and cards can still be added from it.
- Microphone on New wish: tap it and speak, and the words go into the wish box (browser speech recognition, where supported).
- Share one card: the owner or a caretaker can create a link that anyone can open without signing in, shown with a QR code (made in the browser) that can be saved as an image for printing. The shared page shows the card and all its messages, and anyone with the link can leave a message with just their name (no account). Those messages appear in the circle marked “via shared link”, count toward the card turning gold, and the owner or a caretaker can remove them. Each connection can leave 5 messages per card every 10 minutes (keyed hash of the IP), and a hidden field catches simple bots. Migration `0011`. It shows only that card (words, photos, recordings), with no messages, members or anything else from the circle. “Stop sharing” turns the link off straight away. Shared pages are marked noindex.
- Notifications when the owner posts (a wish, a plan, a card, a memory, or photos or a voice note added to a card). They go automatically to everyone in the circle who may see the post; a private wish notifies no one.
  - In the app: a bell with an unread count, a Notifications page, and a live pop-up (an empty Realtime ping on each person’s own channel; 30-second poll as a fallback).
  - By text message (ClickSend): each person can add a mobile number and opt in when they first sign in (Welcome page) or later from the Circle tab. People pick their country (guessed from the device’s time zone) and type the number as they know it, leading 0 and spaces included (“081 234 5678”). The app stores it in the international format (+66812345678). Texts go out after the post is saved and never slow it down.
- The book, which has no finished state:
  - Collection (the design’s updated “Book - collection” screen): filter chips (All and the six kinds), then a 3-column grid of tiles. Each card is a tile with its photo, title and kind, in a gold frame with a glow and star badge when gold, or a soft grey frame otherwise. Wishes without a card yet are dashed amber tiles showing who is on it (“Tom is on it”), “Wish”, or “Done”. Each kind with nothing in it gets a gentle question tile (“Someone to see?”), and the owner gets an “Add a wish” tile.
  - Timeline: cards grouped by “Month · season”, with seasons for the southern hemisphere.
- Voice notes, on Add moments and on any card (the owner records them). Video was removed after the 17 Oct feedback; older video cards still play.
  - Voice notes are recorded with Web Audio as 16 kHz mono WAV, up to 5 minutes, and stop by themselves at 5:00. MediaRecorder was dropped after the 18 Oct feedback (mic errors, saves failing, no playback on iPhone, wrong lengths): its format differs per browser, and Chrome’s WebM has no length. WAV plays everywhere, and its length comes from the samples. A 5-minute note is about 10 MB. Mic problems get specific messages (blocked permission, no mic, mic busy, or an in-app browser like LINE that can’t record). Recording, saving and playback are tested in Chromium and WebKit with a fake microphone (`tests/e2e/voice.spec.ts`). Older WebM notes still play where the browser supports WebM. While recording, live waveform bars follow the microphone level next to the timer. Playback uses the design’s player: a round amber play button, waveform bars that fill as it plays (tap or arrow keys to seek), and “Name · 0:42”. It shows the recorded length (“0:03 / 0:09”) even for older files.
  - They upload the same way as photos. The server checks the stored file’s real type and size and keeps it as-is at `<circleId>/<mediaId>.<ext>`.
  - They play on the card from the same gated media URL.
- Card backs (the flip on first comment and the new-card reveal) carry the 1stQuest logo, a rising sun with a “1”, redrawn as SVG from the brand image, on a white medallion.
- Card level-up: a card turns gold everywhere it appears when it gets its first comment, from anyone. Photos and voice notes alone don’t make it gold. (The spec asked for 3 or more contributors; the user changed this after the 18 Oct review.) Cards with no comments yet show “A message will turn this card gold”. Migration `0006` recalculated existing cards to match. It gets a “Gold card · the family loves this one” chip and posts once to the feed. The moment it turns gold, the card pulses, glows, sweeps with light and throws sparkles, and the person whose message tipped it over sees a one-time “✨ Levelled up” toast. Gold cards get the design’s gold border: a dark-amber-to-gold gradient frame with a soft band of light travelling around it and a glossy highlight. They also keep a gentle shimmer and a slowly turning gold aura (in the book’s collection and timeline too). When a card gets its first comment, it turns over once for everyone viewing it, like the new-card reveal: a smooth 3D turn showing the card’s amber back, twinkling stars, a sparkle burst and a shine as it lands. All motion is off with reduced-motion settings.
- Memorial mode (owner and caretakers): a confirmation screen explains what changes; it can be undone for 30 days.
- If no caretaker can switch, there are two other ways. Both are on the Circle tab:
  - **Trusted person**: the owner or a caretaker names one viewer in advance. That person can turn the book into a memorial album straight away.
  - **Two viewers**: one asks and a different one confirms. The switch then happens 7 days later. The owner and caretakers get a notification and a text (whenever they have a number, even if they haven’t opted in to texts for posts), and any of them can tap “Cancel, I’m still here”. Either viewer can withdraw.
  - Whoever completes the switch becomes a caretaker; nobody else’s role changes. Everyone is notified, and the 30-day undo applies. There is no scheduler: a confirmed request whose 7 days are up is carried out the next time anyone in the circle opens the app. Migration `0007` adds `circles.trusted_user_id` and `memorial_requests`, with one open request per circle.
  - Home becomes the “In loving memory” page (from the design): a headstone with their name, optional years and a few words (set by the owner or a caretaker), flowers and a softly flickering candle. Below are messages from the family, candle and flower counts (“See all” lists every message), and Light a candle, Leave a flower (with optional words) and Open the book. Each person can light one candle and leave one flower a day. Migration `0009` adds the stone fields and `memorial_tributes`. The person’s photo sits in an oval frame on the stone; the owner or a caretaker can add or change it there (resized, with EXIF stripped). Soft music (“Where Rain Meets Light”, an AI-generated track made with Google’s music tools; its file carries Google’s C2PA content credential) fades in and loops while the page is open, and stops when you leave. Browsers block sound until a tap, so if it can’t start straight away it starts on the first tap. A music button turns it off, and the choice is remembered on that device.
  - The menu becomes Home / Book / Family.
  - Adding wishes and “Talk it through” are put away: those pages redirect and the wish API refuses.
  - The book’s empty slots ask for memories instead.
  - “Share a memory” makes a card with no wish (photos, voice, a few words), and the AI writes it as a remembrance.
  - Existing wishes, cards and messages all stay.
- Make a copy of the book (export button on the Book tab; “Make a book for the service” in memorial mode). Choose Photo book or Slideshow, and order By category or By date.
  - Photo book: a PDF built on the server with @react-pdf/renderer and streamed as a download. It has a cover, then one page per card with up to 3 photos, the category, date and place, title, words and who shared it, plus a gold bar for gold cards. It only includes cards the downloader may see.
  - Optional QR codes for voice notes and videos point to `/m/<mediaId>`, which asks for sign-in, then plays the recording only for members who may see that card.
  - Slideshow: a full-screen page with a cover, then one slide per card (photo and words). Arrow keys or space, tapping either side, or swiping move between slides. It also has Play (8 seconds a slide), Full screen, and Escape to leave.
- Photos, voice notes and videos are only served through `GET /api/v1/media/:id`, which checks membership and visibility, then 302s to a 10-minute signed URL.

**Platform**
- `GET /api/health` runs a real `SELECT 1`.
- Every API route checks circle membership, validates input with zod, and returns `{ error: { code, message } }` without stack traces. Logs are structured JSON with a request id.
- Every AI call has a 20s timeout and retries with backoff, and logs model, tokens and latency. Sonnet calls use the server-side refusal fallback.
- Load test (`docs/load-test.md`, scripts in `scripts/loadtest/`): on a preview with its own Supabase free project, 0% errors up to 400 non-stop virtual users (281 requests/s). The median stayed around 500 ms; the slowest 5% of Home and Book reached 3–7 s from 100 users. Live-update connections topped out around 285–300 at once (pages fall back to polling). AI calls were mocked and not load-tested.
- `pnpm lint` includes the banned-word copy lint. `pnpm test` runs 131 tests (incl. email and per-country mobile-number checks, joining from the link, role changes) (authz matrix for the three roles, sign-in codes (single use, wrong tries, rate limit), creating circles and adding people, magic-link expiry and single use, quest states including `locked`, visibility and feed privacy, plan carry-forward, both hemispheres, photo pipeline, level-up firing exactly once at the first comment, voice limits, memorial undo window and handover (trusted switch, ask/confirm/7 days, owner cancel), book page order, a real PDF render, copy lint). `pnpm smoke` is the Playwright demo-loop test.

## Seeded for context

- The “Nana Rose” circle: Nana Rose (owner, rose@wishcircle.demo), Ploy (caretaker), Tom, Krit and Aunt May (viewers), Dr Lin (health professional). Tom is the second demo account for the two-browser check. (The production demo circle was seeded before roles changed; there, Ploy is a caretaker and Rose has no account.)
- Three wishes, two hand-written plans, and quests in mixed states (done, in progress, open, open needing the care team). New plans come from the AI.
- Two cards without photos, and activity items matching the design.

## Not built

- Likes of any kind: removed after the smoke test in favour of comments. The old `card_likes` table is still in the database (migrations are forward-only) but nothing uses it.
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
- Voice note length is checked in the browser (and capped at 5 minutes by the recorder). The server enforces type and size on the stored file but has no media probe to read duration.
- Video recordings from the spec were removed at the user’s request; the API still accepts them, so older cards keep working.
- Level-up counts the card’s maker as a contributor, so a card needs two other people to turn gold.
- Switching to memorial mode posts nothing to the activity feed, on purpose.
- The PDF uses the built-in Helvetica font rather than Atkinson Hyperlegible, so printing doesn’t depend on fetching a font at render time.
- The app is named 1stQuest and uses the amber design from the updated Figma export. Its background image wasn’t in the export, so the page uses a warm cream colour instead.
- “Only the owner and caretakers post” is stricter than the original spec, which let family add wishes and moments. Taking quests stays open to everyone, because it isn’t posting and it is the heart of the demo.
- Gold now comes from comments and contributions only (there are no likes).
- The smoke test creates its own circle on each run (and covers create circle and invite/join) instead of adding to Nana Rose’s circle, so the seeded demo stays clean. It signs in with on-screen codes, creates a circle for a new person, adds the second person, and has them join through the link.
