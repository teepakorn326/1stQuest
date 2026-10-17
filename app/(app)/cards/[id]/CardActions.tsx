"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, MessageIcon, MicIcon, SendIcon, SparkleIcon } from "@/components/icons";
import { GOLD_EVENT } from "@/components/GoldCardFrame";
import { VoiceRecorder, type Recording } from "@/components/Recorders";
import { usePhotoUpload, type StorageConfig } from "@/components/usePhotoUpload";

export function CardActions({
  cardId,
  circleId,
  messageCount,
  canPost,
  storage,
}: {
  cardId: string;
  circleId: string;
  messageCount: number;
  /** Owner only: add photos and voice notes. Everyone can comment. */
  canPost: boolean;
  storage: StorageConfig;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [toast, setToast] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, uploadRecording, stage } = usePhotoUpload(circleId, storage);

  /** The card just turned gold: play the frame's animation and show the one-time toast. */
  function celebrate(levelledUp: unknown) {
    if (levelledUp !== true) return;
    window.dispatchEvent(new CustomEvent(GOLD_EVENT, { detail: { cardId } }));
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
      <div className="flex items-center gap-1.5 border-t border-[#F6EBDA] px-4 pt-2 pb-2 text-base font-bold text-ink-2">
        <MessageIcon /> {messageCount === 1 ? "1 message" : `${messageCount} messages`}
      </div>
      <div className="flex flex-col gap-2 border-t border-[#F6EBDA] bg-surface px-3 py-2.5">
        <form onSubmit={send} className="m-0 flex items-center gap-2">
          {canPost && (
            <>
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
            </>
          )}
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
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-cta text-cta-ink disabled:opacity-50"
          >
            <SendIcon size={20} />
          </button>
        </form>
        {canPost &&
          (recording ? (
            <VoiceRecorder onDone={addRecording} onCancel={() => setRecording(false)} />
          ) : (
            <button type="button" disabled={stage !== "idle"} onClick={() => setRecording(true)} className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[14px] border border-[#EED8B5] bg-surface text-base text-ink disabled:opacity-60">
              <MicIcon size={22} className="text-primary" /> Voice note
            </button>
          ))}
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
