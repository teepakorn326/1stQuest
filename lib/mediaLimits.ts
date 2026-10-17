// Upload limits shared by the browser and the API.

export type UploadKind = "photo" | "voice" | "video";

export const LIMITS: Record<UploadKind, { types: readonly string[]; maxBytes: number; maxSeconds: number | null; label: string }> = {
  photo: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 15 * 1024 * 1024, maxSeconds: null, label: "Photos can be JPG, PNG or WebP, up to 15MB." },
  voice: {
    types: ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/x-m4a", "audio/aac"],
    maxBytes: 20 * 1024 * 1024,
    maxSeconds: 5 * 60,
    label: "Voice notes can be up to 5 minutes.",
  },
  // The spec allows 100MB; Supabase's free plan caps a single file at 50MB.
  video: { types: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 50 * 1024 * 1024, maxSeconds: 2 * 60, label: "Videos can be up to 2 minutes and 50MB." },
};

/** "audio/webm;codecs=opus" → "audio/webm" */
export const baseType = (t: string) => t.split(";")[0]!.trim().toLowerCase();

export function extFor(type: string): string {
  const t = baseType(type);
  return (
    { "audio/webm": "webm", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/mpeg": "mp3", "audio/ogg": "ogg", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" } as Record<string, string>
  )[t] ?? "bin";
}

export function kindOf(type: string): UploadKind | null {
  const t = baseType(type);
  return (Object.keys(LIMITS) as UploadKind[]).find((k) => LIMITS[k].types.includes(t)) ?? null;
}
