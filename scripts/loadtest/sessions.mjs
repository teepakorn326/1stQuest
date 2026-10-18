// Builds the sessions file from a seeded LOAD-TEST database (e.g. if the seed was stopped early).
//   node --env-file=.env.loadtest scripts/loadtest/sessions.mjs <outfile.json>
import { createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
import postgres from "postgres";

const [out] = process.argv.slice(2);
const { DIRECT_URL, SESSION_SECRET } = process.env;
const sql = postgres(DIRECT_URL, { max: 1, prepare: false });
const cookie = (id) => `${id}.${createHmac("sha256", SESSION_SECRET).update(id).digest("base64url")}`;
const rows = await sql`
  select s.id as session_id, m.circle_id,
    (select array_agg(w.id) from wishes w where w.circle_id = m.circle_id) as wish_ids,
    (select array_agg(c.id) from cards c where c.circle_id = m.circle_id) as card_ids,
    (select array_agg(md.id) from media md where md.circle_id = m.circle_id) as media_ids
  from sessions s join memberships m on m.user_id = s.user_id
  join circles ci on ci.id = m.circle_id and ci.patient_name like 'LT %'`;
const complete = rows.filter((r) => r.wish_ids?.length === 3 && r.card_ids?.length === 3 && r.media_ids?.length);
writeFileSync(out, JSON.stringify(complete.map((r) => ({ cookie: cookie(r.session_id), circleId: r.circle_id, wishIds: r.wish_ids, cardIds: r.card_ids, mediaIds: r.media_ids }))));
console.log(JSON.stringify({ sessions: complete.length, circles: new Set(complete.map((r) => r.circle_id)).size }));
await sql.end();
