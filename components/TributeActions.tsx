"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";

/** "Light a candle", "Leave a flower" (with a few words if they like) and "Open the book". */
export function TributeActions({ circleId, name, litToday, flowerToday }: { circleId: string; name: string; litToday: boolean; flowerToday: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"candle" | "flower" | null>(null);
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);

  async function leave(kind: "candle" | "flower") {
    setBusy(kind);
    setError(null);
    const res = await fetch(`/api/v1/circles/${circleId}/tributes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, message: kind === "flower" ? message : undefined }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError("That didn’t go through. Please try again.");
    setWriting(false);
    setMessage("");
    setThanks(kind === "candle" ? `You lit a candle for ${name}.` : `You left a flower for ${name}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <FormError message={error} />
      {thanks && (
        <p className="m-0 text-center text-[15px] text-primary" role="status">
          {thanks}
        </p>
      )}
      <Button onClick={() => leave("candle")} disabled={litToday || busy !== null} className="w-full" data-testid="light-candle">
        {busy === "candle" ? "Lighting…" : litToday ? "You lit a candle today" : "Light a candle"}
      </Button>
      {writing ? (
        <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-3">
          <label htmlFor="flower-words" className="text-[15px] font-bold">
            A few words for {name} <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <Textarea id="flower-words" rows={3} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Thank you for every summer at the beach." />
          <Button onClick={() => leave("flower")} disabled={busy !== null} className="w-full" data-testid="leave-flower-send">
            {busy === "flower" ? "Leaving…" : "Leave the flower"}
          </Button>
          <button type="button" className="min-h-10 text-[15px] font-bold text-primary" onClick={() => setWriting(false)}>
            Not now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" disabled={flowerToday} onClick={() => setWriting(true)} className="px-2 !text-ink" data-testid="leave-flower">
            {flowerToday ? "Flower left ✓" : "Leave a flower"}
          </Button>
          <ButtonLink href="/book" variant="secondary" className="px-2 !text-ink">
            Open the book
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
