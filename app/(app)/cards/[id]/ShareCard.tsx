"use client";
import { useState } from "react";
import { ExportIcon } from "@/components/icons";

/** The card's owner can share this one card with anyone by link, and stop sharing any time. */
export function ShareCard({ cardId, initialUrl, title }: { cardId: string; initialUrl: string | null; title: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/v1/cards/${cardId}/share`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setNote(data?.error?.message ?? "Please try again.");
    setUrl(data.url);
    await send(data.url);
  }

  async function send(link: string) {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: link });
        return;
      }
    } catch {
      return; // share sheet closed
    }
    await navigator.clipboard.writeText(link).catch(() => {});
    setNote("Link copied.");
  }

  async function stop() {
    setBusy(true);
    const res = await fetch(`/api/v1/cards/${cardId}/share`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setUrl(null);
      setNote("Sharing stopped. The old link no longer works.");
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-3.5" data-testid="share-card">
      {url ? (
        <>
          <span className="text-[15px] font-bold">Anyone with this link can see this card</span>
          <span className="text-sm text-ink-3">Only this card: not the rest of the book, the circle, or the messages.</span>
          <div className="flex gap-2">
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-xl border-[1.5px] border-field px-3 text-sm" data-testid="share-url" />
            <button type="button" onClick={() => send(url)} className="h-11 rounded-xl bg-cta px-3.5 text-[15px] font-bold text-cta-ink">
              Share
            </button>
          </div>
          <button type="button" onClick={stop} disabled={busy} className="min-h-11 self-start text-[15px] font-bold text-primary">
            Stop sharing
          </button>
        </>
      ) : (
        <button type="button" onClick={start} disabled={busy} className="flex min-h-11 items-center gap-2 text-[15px] font-bold text-primary" data-testid="share-start">
          <ExportIcon size={20} /> {busy ? "One moment…" : "Share this card"}
        </button>
      )}
      {note && <p className="m-0 text-sm text-ink-3" role="status">{note}</p>}
    </section>
  );
}
