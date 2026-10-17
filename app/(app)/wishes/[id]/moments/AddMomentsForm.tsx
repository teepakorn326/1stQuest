"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CameraIcon, CategoryIcon, CloseIcon, MicIcon, VideoIcon } from "@/components/icons";
import { CATEGORY_LABEL } from "@/lib/activityText";
import { CATEGORIES, type Category } from "@/lib/db/types";
import { RecordingPreview, VoiceRecorder, readVideo, type Recording } from "@/components/Recorders";
import { Button } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { usePhotoUpload, type StorageConfig } from "@/components/usePhotoUpload";

const MAX = 10;
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type Picked = { file: File; url: string };

export type MomentsTarget = { kind: "wish"; wishId: string } | { kind: "memory"; initialCategory: Category | null };

export function AddMomentsForm({
  target,
  circleId,
  patientName,
  storage,
}: {
  target: MomentsTarget;
  circleId: string;
  patientName: string;
  storage: StorageConfig;
}) {
  const [category, setCategory] = useState<Category | null>(target.kind === "memory" ? target.initialCategory : null);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [story, setStory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  // Photos already processed on a failed attempt, so "try again" doesn't re-upload them.
  const [uploadedIds, setUploadedIds] = useState<string[] | null>(null);
  const { upload, uploadRecording, stage } = usePhotoUpload(circleId, storage);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recording, setRecording] = useState(false);
  // Recordings already filed on a failed attempt, keyed by preview URL, so retries don't re-upload.
  const filed = useRef(new Map<string, string>());
  const videoInput = useRef<HTMLInputElement>(null);

  async function pickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const r = await readVideo(file);
      setRecordings((cur) => [...cur, r]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn’t use that video.");
    }
  }

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
    if (target.kind === "memory" && !category) return setError("Pick what kind of memory this is.");
    if (!story.trim() && photos.length === 0 && recordings.length === 0)
      return setError("Add a photo, a voice note or a few words about what happened.");
    setError(null);
    try {
      const photoIds = uploadedIds ?? (await upload(photos.map((p) => p.file)));
      setUploadedIds(photoIds);
      const recordingIds: string[] = [];
      for (const r of recordings) {
        const id = filed.current.get(r.url) ?? (await uploadRecording(r.blob, r.type, r.durationSec));
        filed.current.set(r.url, id);
        recordingIds.push(id);
      }
      const mediaIds = [...photoIds, ...recordingIds];
      setWriting(true);
      const res = await fetch(target.kind === "wish" ? `/api/v1/wishes/${target.wishId}/cards` : `/api/v1/circles/${circleId}/memories`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(target.kind === "wish" ? { story, mediaIds } : { story, mediaIds, category }),
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
  const label = stage === "uploading" ? "Uploading…" : stage === "processing" ? "Getting things ready…" : writing ? "Writing the card…" : "Make the card";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-[22px] px-5 pt-4 pb-5">
        {target.kind === "memory" && (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-base font-bold">What kind of memory?</legend>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === category}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    "flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[15px]",
                    c === category ? "border-2 border-primary bg-primary-soft font-bold text-primary-hover" : "border-[1.5px] border-field bg-surface text-ink",
                  )}
                >
                  <CategoryIcon category={c} className={c === category ? "" : "text-primary"} />
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-bold">Photos</h2>
          <div className="grid grid-cols-3 gap-2" data-testid="photo-grid">
            {photos.map((p, i) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded-xl bg-[#FFDFAE]">
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
            {target.kind === "memory" ? `What do you remember?` : "What happened?"}
          </label>
          <Textarea
            id="story"
            rows={4}
            maxLength={2000}
            disabled={busy}
            placeholder={
              target.kind === "memory"
                ? "e.g. Every Sunday he made pancakes shaped like our initials."
                : "e.g. Nana laughed when the wind took her hat. Mia found a shell and said it was for her."
            }
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
          <span className="text-sm text-ink-3">A few words is plenty. We’ll help shape the card.</span>
        </div>
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-bold">{patientName}’s voice or video</h2>
          {recordings.map((r, i) => (
            <RecordingPreview key={r.url} r={r} onRemove={busy ? undefined : () => setRecordings((cur) => cur.filter((_, j) => j !== i))} />
          ))}
          {recording ? (
            <VoiceRecorder
              onDone={(r) => {
                setRecordings((cur) => [...cur, r]);
                setRecording(false);
              }}
              onCancel={() => setRecording(false)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRecording(true)}
                className="flex h-14 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-field bg-surface text-base text-ink"
              >
                <MicIcon size={20} className="text-primary" /> Voice note
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => videoInput.current?.click()}
                className="flex h-14 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-field bg-surface text-base text-ink"
              >
                <VideoIcon size={20} className="text-primary" /> Video
              </button>
            </div>
          )}
          <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" capture="environment" className="sr-only" onChange={pickVideo} data-testid="video-input" />
          <span className="text-sm text-ink-3">Saved on the card for the family to keep. Voice up to 5 minutes, video up to 2.</span>
        </section>
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
