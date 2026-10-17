import "server-only";

/** Public (anon) Realtime settings for the browser. Null when Supabase isn't configured. */
export function realtimeConfig(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}
