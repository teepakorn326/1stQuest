"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";

export function WelcomeForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error?.message ?? "Please try again.");
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="m-0 flex flex-col gap-3">
      <FormError message={error} />
      <Label htmlFor="name">Your name</Label>
      <Input id="name" autoComplete="given-name" required autoFocus maxLength={60} placeholder="e.g. Ploy" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
