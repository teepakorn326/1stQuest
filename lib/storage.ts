import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const MEDIA_BUCKET = "media";

let client: SupabaseClient | null = null;

export function storageConfigured(): boolean {
  const e = env();
  return Boolean(e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY);
}

/** Service-role client. Server only — never sent to the browser. */
function admin(): SupabaseClient {
  const e = env();
  if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase storage is not configured");
  client ??= createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return client;
}

export async function uploadObject(path: string, body: ArrayBuffer | Buffer, contentType: string): Promise<void> {
  const { error } = await admin().storage.from(MEDIA_BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

/** 10-minute signed URL. Callers must check circle membership first. */
export async function signedUrl(path: string, seconds = 600): Promise<string> {
  const { data, error } = await admin().storage.from(MEDIA_BUCKET).createSignedUrl(path, seconds);
  if (error || !data) throw new Error(`storage sign failed: ${error?.message ?? "no data"}`);
  return data.signedUrl;
}
