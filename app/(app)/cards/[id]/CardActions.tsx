"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, HeartFilled, MessageIcon, MicIcon, SendIcon, SparkleIcon, VideoIcon } from "@/components/icons";
import { VoiceRecorder, readVideo, type Recording } from "@/components/Recorders";
import { usePhotoUpload, type StorageConfig } from "@/components/usePhotoUpload";

export function CardActions({
  cardId,
  circleId,
  liked: initialLiked,
  likes: initialLikes,
  likerNames,
  messageCount,
  storage,
}: {
  cardId: string;
  circleId: string;
  liked: boolean;
  likes: number;
  likerNames: string[];
  messageCount: number;
  storage: StorageConfig;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, uploadRecording, stage } = usePhotoUpload(circleId, storage);
  const [recording, setRecording] = useState(false);
  const [toast, setToast] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);

  function celebrate(levelledUp: unknown) {
    if (levelledUp !== true) return;
    setToast(true);
    setTimeout(() => setToast(false), 4000);
  }

  async function attach(mediaIds: string[]) {
    const res = await fetch(`/api/v1/cards/${cardId}/photos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaIds }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error?.message ?? "That couldn’t be added.");
    celebrate(data?.levelledUp);
    router.refresh();
  }

  async function addRecording(r: Recording) {
    setRecording(false);
    setError(null);
    try {
      await attach([await uploadRecording(r.blob, r.type, r.durationSec)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That couldn’t be added.");
    }
  }

  async function pickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      try {
        await addRecording(await readVideo(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : "We couldn’t use that video.");
      }
    }
  }

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const res = await fetch(`/api/v1/cards/${cardId}/like`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ liked: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/v1/cards/${cardId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);
    setSending(false);
    if (!res?.ok) return setError("Your message didn’t send. Try again.");
    celebrate((await res.json().catch(() => null))?.levelledUp);
    setDraft("");
    router.refresh();
  }

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    try {
      await attach(await upload(files));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Those photos couldn’t be added.");
    }
  }

  const others = likerNames.length ? likerNames.join(", ") : null;
  const likedBy = liked ? (others ? `You, ${others}${likes > likerNames.length + 1 ? " and others" : ""}` : "You") : others;

  return (
    <>
      {toast && (
        <div
          role="status"
          className="reveal-fade-in fixed inset-x-0 top-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-2xl border border-gold bg-gold-soft px-4 py-3 font-bold text-gold-ink shadow-lg"
          data-testid="levelup-toast"
        >
          <SparkleIcon size={18} className="text-gold" /> ✨ Levelled up: this card is gold now
        </div>
      )}
      <div className="flex items-center gap-1 border-t border-[#E6EEF4] px-2 pt-1 pb-2">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Remove your like" : "Like this card"}
          className={`flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-base font-bold ${liked ? "text-primary" : "text-ink-2"}`}
          data-testid="like"
        >
          <HeartFilled filled={liked} /> {likes}
        </button>
        <span className="flex h-11 items-center gap-1.5 px-2.5 text-base font-bold text-ink-2">
          <MessageIcon /> {messageCount}
        </span>
        {likedBy && <span className="ml-auto pr-2 text-sm text-ink-3">{likedBy}</span>}
      </div>
      <div className="flex flex-col gap-2 border-t border-[#E6EEF4] bg-surface px-3 py-2.5">
        <form onSubmit={send} className="m-0 flex items-center gap-2">
          <button
            type="button"
            aria-label="Add a photo"
            disabled={stage !== "idle"}
            onClick={() => fileInput.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary disabled:opacity-60"
          >
            <CameraIcon size={20} />
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={addPhotos} />
          <label htmlFor="msg" className="sr-only">
            Write a message
          </label>
          <input
            id="msg"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Write a message"
            autoComplete="off"
            className="h-[46px] min-w-0 flex-1 rounded-3xl border-[1.5px] border-field bg-bg px-4 text-base focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={sending || !draft.trim()}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
          >
            <SendIcon size={20} />
          </button>
        </form>
        {recording ? (
          <VoiceRecorder onDone={addRecording} onCancel={() => setRecording(false)} />
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={stage !== "idle"}
              onClick={() => setRecording(true)}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-field text-[15px] text-ink disabled:opacity-60"
            >
              <MicIcon size={18} className="text-primary" /> Voice note
            </button>
            <button
              type="button"
              disabled={stage !== "idle"}
              onClick={() => videoInput.current?.click()}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-field text-[15px] text-ink disabled:opacity-60"
            >
              <VideoIcon size={18} className="text-primary" /> Video
            </button>
            <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" capture="environment" className="sr-only" onChange={pickVideo} />
          </div>
        )}
        {stage !== "idle" && <p className="m-0 text-sm text-ink-3">{stage === "uploading" ? "Uploading…" : "Getting it ready…"}</p>}
        {error && (
          <p role="alert" className="m-0 text-sm text-warm-ink">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
