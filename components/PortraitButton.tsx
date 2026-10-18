"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "@/components/icons";

/** Owner or caretaker: add or change the person's photo shown on the stone. */
export function PortraitButton({ circleId, name, hasPhoto }: { circleId: string; name: string; hasPhoto: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    const res = await fetch(`/api/v1/circles/${circleId}/photo`, { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "That photo didn’t upload. Try again.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex items-center gap-2 self-start text-[15px] font-bold text-primary disabled:opacity-60" data-testid="portrait-button">
        <CameraIcon size={18} /> {busy ? "Uploading…" : hasPhoto ? `Change ${name}’s photo` : `Add ${name}’s photo to the stone`}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} />
      {error && (
        <p className="m-0 text-sm text-warm-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
