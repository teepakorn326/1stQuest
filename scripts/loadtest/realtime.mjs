// How many live-update connections the LOAD-TEST Supabase project accepts at once.
//   node --env-file=.env.loadtest scripts/loadtest/realtime.mjs [max=300] [step=25]
// Opens one Realtime client per simulated phone, each listening on its circle's channel, like LiveRefresh.
import { createClient } from "@supabase/supabase-js";

const [maxArg = "300", stepArg = "25"] = process.argv.slice(2);
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("load .env.loadtest");
const clients = [];
let ok = 0;
let failed = 0;
for (let n = 0; n < Number(maxArg); ) {
  const batch = [];
  for (let i = 0; i < Number(stepArg); i++, n++) {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    clients.push(sb);
    batch.push(
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve("TIMED_OUT"), 15_000);
        sb.channel(`circle:lt-${n % 200}`, { config: { private: false } })
          .on("broadcast", { event: "activity" }, () => {})
          .subscribe((status) => {
            if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              clearTimeout(timer);
              resolve(status);
            }
          });
      }),
    );
  }
  const results = await Promise.all(batch);
  ok += results.filter((r) => r === "SUBSCRIBED").length;
  failed += results.filter((r) => r !== "SUBSCRIBED").length;
  console.log(JSON.stringify({ attempted: n, connected: ok, failed }));
  if (failed > 0) break;
}
for (const sb of clients) void sb.removeAllChannels();
setTimeout(() => process.exit(0), 2000);
