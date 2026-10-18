"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { EmailInput } from "@/components/EmailInput";
import { PhoneInput } from "@/components/PhoneInput";
import { emailProblem, phoneProblem } from "@/lib/validate";
import { Button } from "@/components/ui/Button";
import { DevBanner } from "@/components/ui/DevBanner";
import { FormError, Input, Label } from "@/components/ui/Field";

type Via = "email" | "phone";
type Step = { kind: "contact" } | { kind: "code"; devCode: string | null };

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

/**
 * Sign in with a one-time code sent to your email or mobile number, or (if you set one) a password.
 * People a caretaker added use the email or number the caretaker entered.
 */
export function SignInForm({ next, initialError, autoFocus }: { next: string | null; initialError: string | null; autoFocus: boolean }) {
  const router = useRouter();
  const [via, setVia] = useState<Via>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "contact" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const contact = via === "email" ? { email } : { phone };
  const shown = via === "email" ? email : phone;

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const problem = via === "email" || usePassword ? emailProblem(email) : phoneProblem(phone, { required: true });
    setFieldError(problem);
    if (problem) return;
    setBusy(true);
    const res = usePassword ? await post("/api/v1/auth/password", { email, password }) : await post("/api/v1/auth/code", { ...contact, next });
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "We couldn’t reach 1stQuest. Please check your connection.");
    if (usePassword) {
      router.replace(next ?? "/home");
      router.refresh();
      return;
    }
    setCode("");
    setStep({ kind: "code", devCode: data.devCode ?? null });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await post("/api/v1/auth/code/verify", { ...contact, code });
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      return setError(data?.error?.message ?? "Please try again.");
    }
    router.replace(data.next);
    router.refresh();
  }

  if (step.kind === "code") {
    return (
      <form onSubmit={verify} className="m-0 flex flex-col gap-3" data-testid="code-step">
        <h2 className="m-0 text-xl font-bold">Enter your code</h2>
        <p className="m-0 text-ink-2">
          We sent a 6-digit code to <b className="text-ink">{shown}</b>. It expires in 10 minutes.
        </p>
        {step.devCode && (
          <DevBanner>
            <p className="m-0">
              {via === "email" ? "Email" : "Texting"} isn’t set up on this server, so here’s your code:{" "}
              <b className="text-lg tracking-widest" data-testid="dev-code">
                {step.devCode}
              </b>
            </p>
          </DevBanner>
        )}
        <FormError message={error} />
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
          autoFocus
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center text-2xl tracking-[0.4em]"
        />
        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? "Checking…" : "Sign in"}
        </Button>
        <div className="flex justify-between">
          <button type="button" className="min-h-11 text-[15px] font-bold text-primary" onClick={() => sendCode()}>
            Send a new code
          </button>
          <button type="button" className="min-h-11 text-[15px] font-bold text-primary" onClick={() => setStep({ kind: "contact" })}>
            Change {via === "email" ? "email" : "number"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="m-0 flex flex-col gap-3" noValidate>
      <FormError message={error} />
      {!usePassword && (
        <div role="tablist" aria-label="Sign in with" className="grid grid-cols-2 gap-1 rounded-[14px] bg-tint p-1">
          {(["email", "phone"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={via === v}
              onClick={() => {
                setVia(v);
                setError(null);
                setFieldError(null);
              }}
              className={clsx("h-11 rounded-[11px] text-[15px]", via === v ? "bg-surface font-bold text-ink shadow-[0_1px_2px_rgba(28,43,58,0.12)]" : "text-ink-2")}
            >
              {v === "email" ? "Email" : "Mobile number"}
            </button>
          ))}
        </div>
      )}
      {via === "email" || usePassword ? (
        <>
          <Label htmlFor="email">Email</Label>
          <EmailInput id="email" value={email} onChange={setEmail} error={fieldError} autoFocus={autoFocus} placeholder="you@example.com" />
        </>
      ) : (
        <>
          <Label htmlFor="phone">Mobile number</Label>
          <PhoneInput id="phone" value={null} onChange={setPhone} required error={fieldError} testId="signin-phone" />
        </>
      )}
      {usePassword && (
        <>
          <Label htmlFor="password" className="mt-1">
            Password
          </Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      )}
      <Button type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Sending…" : usePassword ? "Sign in" : "Send me a code"}
      </Button>
      {!usePassword && (
        <p className="m-0 text-center text-[15px] text-ink-3">
          We’ll {via === "email" ? "email" : "text"} you a 6-digit code. No password needed.
        </p>
      )}
      <div className="my-1 flex items-center gap-3 text-sm text-ink-3">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        onClick={() => {
          setUsePassword((v) => !v);
          setError(null);
        }}
        className="min-h-11 text-base font-bold text-primary"
      >
        {usePassword ? "Get a code instead" : "Sign in with email and password"}
      </button>
    </form>
  );
}
