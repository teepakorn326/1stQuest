// Ramps virtual users against a LOAD-TEST deployment and reports latency, throughput and errors.
//   BASE=https://<preview>.vercel.app BYPASS=<vercel protection bypass> node scripts/loadtest/run.mjs <sessions.json> [stages] [seconds]
// stages: comma-separated concurrent users, e.g. 10,25,50,100,200,400. Stops after a stage that breaks
// (over 5% errors or p95 over 5 s). Each virtual user loops like a real person: Home → Book → a wish →
// a card → one of its photos, and every 5th loop posts a comment.
import { readFileSync } from "node:fs";

const [file, stagesArg = "10,25,50,100,200,400", secsArg = "30"] = process.argv.slice(2);
const BASE = process.env.BASE;
if (!BASE || /1stquest\.vercel\.app/.test(BASE)) throw new Error("set BASE to the load-test preview (never production)");
const sessions = JSON.parse(readFileSync(file, "utf8"));
const stages = stagesArg.split(",").map(Number);
const SECS = Number(secsArg);
const bypass = process.env.BYPASS ? { "x-vercel-protection-bypass": process.env.BYPASS } : {};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function hit(stats, name, url, s, init = {}) {
  const t = performance.now();
  let status = 0;
  try {
    const res = await fetch(BASE + url, {
      redirect: "manual",
      ...init,
      headers: { cookie: `wc_session=${s.cookie}; wc_circle=${s.circleId}`, ...bypass, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
    });
    status = res.status;
    await res.arrayBuffer();
  } catch {
    status = -1; // network error or timeout
  }
  const ms = performance.now() - t;
  (stats.by[name] ??= []).push(ms);
  stats.all.push(ms);
  stats.codes[status] = (stats.codes[status] ?? 0) + 1;
  if (status < 200 || status >= 400) stats.errors++;
}

async function user(stats, until) {
  let i = 0;
  while (Date.now() < until) {
    const s = pick(sessions);
    await hit(stats, "home", "/home", s);
    await hit(stats, "book", "/book", s);
    await hit(stats, "wish", `/wishes/${pick(s.wishIds)}`, s);
    const card = pick(s.cardIds);
    await hit(stats, "card", `/cards/${card}`, s);
    await hit(stats, "photo", `/api/v1/media/${pick(s.mediaIds)}`, s);
    if (++i % 5 === 0) {
      await hit(stats, "comment", `/api/v1/cards/${card}/messages`, s, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Load test comment" }),
      });
    }
  }
}

const pct = (a, p) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};

const rows = [];
for (const vus of stages) {
  const stats = { all: [], by: {}, codes: {}, errors: 0 };
  const until = Date.now() + SECS * 1000;
  const start = Date.now();
  await Promise.all(Array.from({ length: vus }, () => user(stats, until)));
  const secs = (Date.now() - start) / 1000;
  const row = {
    users: vus,
    requests: stats.all.length,
    rps: Math.round(stats.all.length / secs),
    p50: pct(stats.all, 50),
    p95: pct(stats.all, 95),
    p99: pct(stats.all, 99),
    errorPct: +((stats.errors / Math.max(1, stats.all.length)) * 100).toFixed(2),
    codes: stats.codes,
    p95ByPage: Object.fromEntries(Object.entries(stats.by).map(([k, v]) => [k, pct(v, 95)])),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
  if (row.errorPct > 5 || row.p95 > 5000) {
    console.log(`stopping: broke at ${vus} concurrent users`);
    break;
  }
}
console.log("\nusers  req/s   p50ms  p95ms  p99ms  errors");
for (const r of rows) console.log(`${String(r.users).padStart(5)}  ${String(r.rps).padStart(5)}  ${String(r.p50).padStart(6)}  ${String(r.p95).padStart(5)}  ${String(r.p99).padStart(5)}  ${r.errorPct}%`);
