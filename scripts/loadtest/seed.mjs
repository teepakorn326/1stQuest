// Seeds a LOAD-TEST database (never production) with fake circles and signed-in users.
//   node --env-file=.env.loadtest scripts/loadtest/seed.mjs <outfile.json> [circles=200]
// Writes session cookies for every fake user to <outfile.json> (keep it out of git).
import { createHmac, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const [out, n = "200"] = process.argv.slice(2);
if (!out) throw new Error("usage: seed.mjs <outfile.json> [circles]");
const { DIRECT_URL, SESSION_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DIRECT_URL || !SESSION_SECRET) throw new Error("load .env.loadtest");
if (/prod|1stquest\.vercel\.app/i.test(DIRECT_URL)) throw new Error("refusing: looks like production");
const CIRCLES = Number(n);
const PER = 10; // owner + caretaker + 8 viewers
const sql = postgres(DIRECT_URL, { max: 4, prepare: false, onnotice: () => {} });

// Same format as lib/auth/cookie.ts: value.base64url(HMAC-SHA256(value)).
const cookie = (id) => `${id}.${createHmac("sha256", SESSION_SECRET).update(id).digest("base64url")}`;

// One small shared photo in Storage, referenced by every fake photo row.
const PHOTO_PATH = "loadtest/sample.jpg";
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await sb.storage.createBucket("media", { public: false, fileSizeLimit: 50_000_000 }).catch(() => {});
  const jpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
    "base64",
  );
  const { error } = await sb.storage.from("media").upload(PHOTO_PATH, jpeg, { contentType: "image/jpeg", upsert: true });
  if (error) console.warn("photo upload:", error.message);
}

const t0 = Date.now();
await sql`delete from circles where patient_name like 'LT %'`;
await sql`delete from users where email like 'lt-%@loadtest.example'`;

const people = [];
for (let c = 0; c < CIRCLES; c++) for (let p = 0; p < PER; p++) people.push({ id: randomUUID(), email: `lt-${c}-${p}@loadtest.example`, name: `Tester ${c}-${p}`, c, p });
for (let i = 0; i < people.length; i += 1000) {
  const chunk = people.slice(i, i + 1000);
  await sql`insert into users ${sql(chunk.map(({ id, email, name }) => ({ id, email, name })))}`;
}

const result = [];
for (let c = 0; c < CIRCLES; c++) {
  const members = people.filter((x) => x.c === c);
  const [circle] = await sql`insert into circles (patient_name, mobility) values (${`LT ${c}`}, 'short_walks_with_help') returning id`;
  const cid = circle.id;
  await sql`insert into memberships ${sql(members.map((m) => ({ circle_id: cid, user_id: m.id, role: m.p === 0 ? "owner" : m.p === 1 ? "caretaker" : "viewer" })))}`;
  const caretaker = members[1].id;
  const wishes = [];
  for (let w = 0; w < 3; w++) {
    const [wish] = await sql`insert into wishes (circle_id, author_id, text, category, visibility) values (${cid}, ${caretaker}, ${`Load test wish ${w}`}, 'places', 'circle') returning id`;
    const [plan] = await sql`insert into plans (wish_id, text, based_on_mobility) values (${wish.id}, 'A gentle plan.', 'short_walks_with_help') returning id`;
    await sql`insert into quests ${sql([0, 1, 2, 3].map((q) => ({ wish_id: wish.id, plan_id: plan.id, title: `Quest ${q}`, position: q })))}`;
    wishes.push(wish.id);
  }
  const cards = [];
  const media = [];
  for (let k = 0; k < 3; k++) {
    const [card] = await sql`
      insert into cards (circle_id, wish_id, author_id, category, title, body, story)
      values (${cid}, ${wishes[k]}, ${caretaker}, 'places', ${`Load test card ${k}`}, 'A short body.', 'story') returning id`;
    const photos = [randomUUID(), randomUUID()];
    await sql`insert into media ${sql(photos.map((id) => ({ id, circle_id: cid, card_id: card.id, uploader_id: caretaker, kind: "photo", path: PHOTO_PATH, mime_type: "image/jpeg", bytes: 600 })))}`;
    await sql`update cards set cover_media_id = ${photos[0]} where id = ${card.id}`;
    await sql`insert into card_messages ${sql(members.slice(2, 5).map((m) => ({ card_id: card.id, author_id: m.id, text: "Lovely." })))}`;
    cards.push(card.id);
    media.push(...photos);
  }
  await sql`insert into activity ${sql(members.map((m) => ({ circle_id: cid, actor_id: m.id, type: "member_joined", ref_id: m.id })))}`;
  const sessions = await sql`insert into sessions ${sql(members.map((m) => ({ user_id: m.id, expires_at: new Date(Date.now() + 2 * 86400_000) })))} returning id, user_id`;
  for (const s of sessions) result.push({ cookie: cookie(s.id), circleId: cid, wishIds: wishes, cardIds: cards, mediaIds: media });
}
writeFileSync(out, JSON.stringify(result));
console.log(JSON.stringify({ circles: CIRCLES, users: people.length, sessions: result.length, seconds: Math.round((Date.now() - t0) / 1000) }));
await sql.end();
