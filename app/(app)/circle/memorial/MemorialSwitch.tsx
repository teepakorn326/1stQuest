"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

export function MemorialSwitch({ circleId, to, label, secondary }: { circleId: string; to: "memorial" | "active"; label: string; secondary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/circles/${circleId}/mode`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: to }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error?.message ?? "Please try again.");
      setBusy(false);
      return;
    }
    router.replace("/home");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      <Button onClick={go} disabled={busy} variant={secondary ? "secondary" : "primary"} className="w-full" data-testid={`mode-${to}`}>
        {busy ? "One moment…" : label}
      </Button>
    </div>
  );
}
