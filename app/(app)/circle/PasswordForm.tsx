"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";

/** Optional password, for people who'd rather not wait for an email each time. */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/auth/password", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      return setError(data?.error?.message ?? "Please try again.");
    }
    setSaved(true);
    setOpen(false);
    setPassword("");
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-1">
        {saved && <p className="m-0 text-[15px] text-primary">Password saved.</p>}
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 self-start text-[15px] font-bold text-primary">
          {hasPassword || saved ? "Change password" : "Set a password (optional)"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="m-0 flex flex-col gap-2">
      <Label htmlFor="new-password">New password</Label>
      <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : "Save password"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
