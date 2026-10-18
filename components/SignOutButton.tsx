"use client";
import { useState } from "react";

/**
 * Signs out once, shows that it's happening (so nobody taps again while the server answers), then
 * does a full page load of the sign-in screen so no page from the old session stays in memory.
 */
export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    await fetch("/api/v1/auth/sign-out", { method: "POST", redirect: "manual" }).catch(() => null);
    window.location.replace("/sign-in");
  }
  return (
    <button type="button" onClick={signOut} disabled={busy} className={className ?? "min-h-11 text-[15px] font-bold text-primary disabled:opacity-60"} data-testid="sign-out">
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
