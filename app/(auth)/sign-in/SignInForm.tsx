"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";
import { DevBanner } from "@/components/ui/DevBanner";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "dev"; link: string };

export function SignInForm({ next, initialError, autoFocus }: { next: string | null; initialError: string | null; autoFocus: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [error, setError] = useState<string | null>(initialError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState({ kind: "sending" });
    const res = await fetch(usePassword ? "/api/v1/auth/password" : "/api/v1/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(usePassword ? { email, password } : { email, next }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error?.message ?? "We couldn’t reach Wish Circle. Please check your connection.");
      setState({ kind: "idle" });
      return;
    }
    if (usePassword) {
      router.replace(next ?? "/home");
      router.refresh();
    } else if (data.devLink) {
      setState({ kind: "dev", link: data.devLink });
    } else {
      setState({ kind: "sent", email });
    }
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="m-0 text-lg font-bold">Check your email</h2>
        <p className="m-0 text-ink-2">
          We sent a sign-in link to <b className="text-ink">{state.email}</b>. Open it on this device.
        </p>
        <button type="button" className="self-start text-[15px] font-bold text-primary" onClick={() => setState({ kind: "idle" })}>
          Use a different email
        </button>
      </div>
    );
  }

  if (state.kind === "dev") {
    return (
      <DevBanner>
        <p className="m-0">Email isn’t set up on this server, so here’s your sign-in link:</p>
        <a href={state.link} className="mt-2 inline-block font-bold break-all text-primary" data-testid="dev-link">
          Sign in as {email}
        </a>
      </DevBanner>
    );
  }

  return (
    <form onSubmit={submit} className="m-0 flex flex-col gap-3">
      <FormError message={error} />
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        autoFocus={autoFocus}
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {usePassword && (
        <>
          <Label htmlFor="password" className="mt-1">
            Password
          </Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      )}
      <Button type="submit" disabled={state.kind === "sending"} className="mt-1 w-full">
        {state.kind === "sending" ? "Sending…" : usePassword ? "Sign in" : "Send me a sign-in link"}
      </Button>
      {!usePassword && <p className="m-0 text-center text-[15px] text-ink-3">We’ll email you a link. No password needed.</p>}
      <div className="my-1 flex items-center gap-3 text-sm text-ink-3">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <button type="button" onClick={() => setUsePassword((v) => !v)} className="min-h-11 text-base font-bold text-primary">
        {usePassword ? "Email me a sign-in link instead" : "Sign in with email and password"}
      </button>
    </form>
  );
}
