"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/PhoneInput";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";

export function WelcomeForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Mobile number first, so a typo shows here before we move on.
    if (phone.trim()) {
      const r = await fetch("/api/v1/me/phone", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, optIn }),
      }).catch(() => null);
      if (!r?.ok) {
        const data = await r?.json().catch(() => null);
        setError(data?.error?.message ?? "Please check the mobile number.");
        setBusy(false);
        return;
      }
    }
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
      <Label htmlFor="phone" className="mt-2">
        Mobile number <span className="font-normal text-ink-3">(optional)</span>
      </Label>
      <PhoneInput id="phone" value={null} onChange={setPhone} testId="welcome-phone" />
      {phone.trim() && (
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="h-5 w-5 accent-primary" />
          Text me when the owner posts something new
        </label>
      )}
      <span className="text-sm text-ink-3">You can change this later in Circle.</span>
      <Button type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
