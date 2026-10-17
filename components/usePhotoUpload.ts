"use client";
import { useCallback, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export type StorageConfig = { url: string; anonKey: string } | null;

/**
 * Upload pipeline: ask for signed slots → send originals straight to Storage → server resizes
 * with sharp and returns media ids.
 */
export function usePhotoUpload(circleId: string, storage: StorageConfig) {
  const [stage, setStage] = useState<"idle" | "uploading" | "processing">("idle");

  const upload = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (files.length === 0) return [];
      if (!storage) throw new Error("Photo storage isn’t set up on this server.");
      setStage("uploading");
      try {
        const res = await fetch(`/api/v1/circles/${circleId}/uploads`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ files: files.map((f) => ({ type: f.type, size: f.size })) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message ?? "We couldn’t start the upload.");
        const sb = createClient(storage.url, storage.anonKey, { auth: { persistSession: false } });
        const slots: { mediaId: string; path: string; token: string }[] = data.slots;
        await Promise.all(
          slots.map(async (slot, i) => {
            const { error } = await sb.storage.from("media").uploadToSignedUrl(slot.path, slot.token, files[i]!, {
              contentType: files[i]!.type,
            });
            if (error) throw new Error("A photo didn’t upload. Check your connection and try again.");
          }),
        );
        setStage("processing");
        const done = await fetch(`/api/v1/circles/${circleId}/photos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mediaIds: slots.map((s) => s.mediaId) }),
        });
        const out = await done.json();
        if (!done.ok) throw new Error(out?.error?.message ?? "We couldn’t process the photos.");
        return out.mediaIds as string[];
      } finally {
        setStage("idle");
      }
    },
    [circleId, storage],
  );

  /** Voice note or video: signed slot → straight to Storage → server checks and files it. */
  const uploadRecording = useCallback(
    async (file: Blob, type: string, durationSec: number): Promise<string> => {
      if (!storage) throw new Error("Storage isn’t set up on this server.");
      setStage("uploading");
      try {
        const res = await fetch(`/api/v1/circles/${circleId}/uploads`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ files: [{ type, size: file.size }] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message ?? "We couldn’t start the upload.");
        const slot: { mediaId: string; path: string; token: string } = data.slots[0];
        const sb = createClient(storage.url, storage.anonKey, { auth: { persistSession: false } });
        const { error } = await sb.storage.from("media").uploadToSignedUrl(slot.path, slot.token, file, { contentType: type });
        if (error) throw new Error("The recording didn’t upload. Check your connection and try again.");
        setStage("processing");
        const done = await fetch(`/api/v1/circles/${circleId}/recordings`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mediaId: slot.mediaId, durationSec }),
        });
        const out = await done.json();
        if (!done.ok) throw new Error(out?.error?.message ?? "We couldn’t save the recording.");
        return out.mediaId as string;
      } finally {
        setStage("idle");
      }
    },
    [circleId, storage],
  );

  return { upload, uploadRecording, stage };
}
