"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

export function JoinButton({ token, label }: { token: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/invites/${encodeURIComponent(token)}/accept`, { method: "POST" }).catch(() => null);
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
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      <Button onClick={join} disabled={busy} className="w-full">
        {busy ? "Joining…" : label}
      </Button>
    </div>
  );
}
