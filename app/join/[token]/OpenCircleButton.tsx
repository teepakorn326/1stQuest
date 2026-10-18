"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

/** Makes this the circle you're looking at, then goes home. */
export function OpenCircleButton({ circleId, label }: { circleId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/circles/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ circleId }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("Please try again.");
      setBusy(false);
      return;
    }
    router.replace("/home");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      <Button onClick={open} disabled={busy} className="w-full" data-testid="open-circle">
        {busy ? "Opening…" : label}
      </Button>
    </div>
  );
}
