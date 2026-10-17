"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { usePhotoUpload, type StorageConfig } from "@/components/usePhotoUpload";

const MAX = 10;
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type Picked = { file: File; url: string };

export function AddMomentsForm({ wishId, circleId, storage }: { wishId: string; circleId: string; storage: StorageConfig }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [story, setStory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  // Photos already processed on a failed attempt, so "try again" doesn't re-upload them.
  const [uploadedIds, setUploadedIds] = useState<string[] | null>(null);
  const { upload, stage } = usePhotoUpload(circleId, storage);

  // Revoke preview URLs on unmount only; revoking on every change would blank the previews still shown.
  const urls = useRef<string[]>([]);
  useEffect(() => {
    urls.current = photos.map((p) => p.url);
  }, [photos]);
  useEffect(() => {
    return () => urls.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    const bad = files.find((f) => !TYPES.includes(f.type));
    if (bad) return setError("Photos can be JPG, PNG or WebP. On iPhone, choose “Most Compatible” in camera settings.");
    if (files.some((f) => f.size > MAX_BYTES)) return setError("Each photo can be up to 15MB.");
    setUploadedIds(null);
    setPhotos((cur) => [...cur, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX));
  }

  function remove(i: number) {
    setUploadedIds(null);
    setPhotos((cur) => {
      const gone = cur[i];
      if (gone) URL.revokeObjectURL(gone.url);
      return cur.filter((_, j) => j !== i);
    });
  }

  async function makeCard() {
    if (!story.trim() && photos.length === 0) return setError("Add a photo or a few words about what happened.");
    setError(null);
    try {
      const mediaIds = uploadedIds ?? (await upload(photos.map((p) => p.file)));
      setUploadedIds(mediaIds);
      setWriting(true);
      const res = await fetch(`/api/v1/wishes/${wishId}/cards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ story, mediaIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "We couldn’t write the card. Try again.");
      router.push(`/cards/${data.card.id}/new`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setWriting(false);
    }
  }

  const busy = stage !== "idle" || writing;
  const label = stage === "uploading" ? "Uploading photos…" : stage === "processing" ? "Getting photos ready…" : writing ? "Writing the card…" : "Make the card";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-[22px] px-5 pt-4 pb-5">
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-bold">Photos</h2>
          <div className="grid grid-cols-3 gap-2" data-testid="photo-grid">
            {photos.map((p, i) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded-xl bg-[#B5D0E7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {!busy && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white"
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
            ))}
            {photos.length < MAX && (
              <button
                type="button"
                disabled={busy}
                onClick={() => input.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-accent bg-surface text-sm font-bold text-primary"
              >
                <CameraIcon /> Add photos
              </button>
            )}
          </div>
          <input ref={input} type="file" accept={TYPES.join(",")} multiple className="sr-only" onChange={pick} data-testid="photo-input" />
          <span className="text-sm text-ink-3">Up to {MAX} photos.</span>
        </section>
        <div className="flex flex-col gap-2">
          <label htmlFor="story" className="text-base font-bold">
            What happened?
          </label>
          <Textarea
            id="story"
            rows={4}
            maxLength={2000}
            disabled={busy}
            placeholder="e.g. Nana laughed when the wind took her hat. Mia found a shell and said it was for her."
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
          <span className="text-sm text-ink-3">A few words is plenty. We’ll help shape the card.</span>
        </div>
        <FormError message={error} />
      </div>
      <div className="sticky bottom-[76px] border-t border-line bg-bg px-5 pt-3 pb-4">
        <Button onClick={makeCard} disabled={busy} className="w-full" data-testid="make-card">
          {label}
        </Button>
      </div>
    </div>
  );
}
