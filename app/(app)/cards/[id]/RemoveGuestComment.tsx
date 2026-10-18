"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Owner or caretaker: take down a comment someone left from the public share link. */
export function RemoveGuestComment({ cardId, messageId }: { cardId: string; messageId: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    await fetch(`/api/v1/cards/${cardId}/messages/${messageId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    router.refresh();
  }
  return sure ? (
    <span className="flex gap-3 text-sm font-bold">
      <button type="button" disabled={busy} onClick={remove} className="min-h-9 text-warm-ink">
        Remove
      </button>
      <button type="button" onClick={() => setSure(false)} className="min-h-9 text-primary">
        Keep
      </button>
    </span>
  ) : (
    <button type="button" onClick={() => setSure(true)} className="min-h-9 text-sm font-bold text-primary" data-testid="remove-guest-comment">
      Remove
    </button>
  );
}
