"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, HeartFilled, MessageIcon, SendIcon } from "@/components/icons";
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
  const { upload, stage } = usePhotoUpload(circleId, storage);

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
    setDraft("");
    router.refresh();
  }

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    try {
      const mediaIds = await upload(files);
      const res = await fetch(`/api/v1/cards/${cardId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaIds }),
      });
      if (!res.ok) throw new Error("Those photos couldn’t be added.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Those photos couldn’t be added.");
    }
  }

  const others = likerNames.length ? likerNames.join(", ") : null;
  const likedBy = liked ? (others ? `You, ${others}${likes > likerNames.length + 1 ? " and others" : ""}` : "You") : others;

  return (
    <>
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
        {stage !== "idle" && <p className="m-0 text-sm text-ink-3">{stage === "uploading" ? "Uploading photos…" : "Getting photos ready…"}</p>}
        {error && (
          <p role="alert" className="m-0 text-sm text-warm-ink">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
