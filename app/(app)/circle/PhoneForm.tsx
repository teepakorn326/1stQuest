"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";

/** Opt in to a text message whenever the owner posts. */
export function PhoneForm({ phone: initialPhone, optIn: initialOptIn }: { phone: string | null; optIn: boolean }) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [optIn, setOptIn] = useState(initialOptIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/v1/me/phone", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, optIn }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "Please try again.");
    setPhone(data.phone ?? "");
    setOptIn(data.optIn);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="m-0 flex flex-col gap-2" data-testid="phone-form">
      <Label htmlFor="phone">Mobile number for texts</Label>
      <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+61 4… or +66 8…" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label className="flex min-h-11 items-center gap-3 text-[15px]">
        <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="h-5 w-5 accent-primary" />
        Text me when the owner posts something new
      </label>
      <FormError message={error} />
      {saved && <p className="m-0 text-sm text-primary" role="status">{optIn ? "Saved. You’ll get a text when the owner posts." : "Saved. No texts."}</p>}
      <Button type="submit" variant="secondary" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
