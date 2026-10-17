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

/** One-time signed upload URL so the browser can send a large original straight to Storage. */
export async function signedUpload(path: string): Promise<{ path: string; token: string }> {
  const { data, error } = await admin().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`storage signed upload failed: ${error?.message ?? "no data"}`);
  return { path: data.path, token: data.token };
}

export async function downloadObject(path: string): Promise<Buffer | null> {
  const { data, error } = await admin().storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length) await admin().storage.from(MEDIA_BUCKET).remove(paths);
}
