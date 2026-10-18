"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { EmailInput } from "@/components/EmailInput";
import { PhoneInput } from "@/components/PhoneInput";
import { Button } from "@/components/ui/Button";
import { DevBanner } from "@/components/ui/DevBanner";
import { FormError, Input, Label } from "@/components/ui/Field";
import { emailProblem, phoneProblem } from "@/lib/validate";

type JoinRole = "viewer" | "health";

/** "I'm family or a friend" / "I'm a health professional": same access, different label. */
export function RolePicker({ value, onChange }: { value: JoinRole; onChange: (r: JoinRole) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-base font-bold">I’m</legend>
      <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-tint p-1">
        {(
          [
            ["viewer", "Family or a friend"],
            ["health", "A health professional"],
          ] as const
        ).map(([r, label]) => (
          <button
            key={r}
            type="button"
            aria-pressed={value === r}
            onClick={() => onChange(r)}
            className={clsx("min-h-11 rounded-[11px] px-2 text-[15px] leading-tight", value === r ? "bg-surface font-bold text-ink shadow-[0_1px_2px_rgba(28,43,58,0.12)]" : "text-ink-2")}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 mb-0 text-sm text-ink-3">You’ll see the wishes and cards, leave messages and take quests.</p>
    </fieldset>
  );
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

/** Register from a circle's link or QR code: name, email, mobile, who you are → a code by email → in. */
export function RegisterForm({ token, patientName }: { token: string; patientName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<JoinRole>("viewer");
  const [step, setStep] = useState<"details" | "code">("details");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string | null; phone?: string | null }>({});
  const details = { name, email, phone, role };

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const errs = { email: emailProblem(email), phone: phoneProblem(phone) };
    setFieldErrors(errs);
    if (!name.trim()) return setError("Add your name.");
    if (errs.email || errs.phone) return;
    setBusy(true);
    const res = await post(`/api/v1/join/${token}/code`, details);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "We couldn’t reach 1stQuest. Please check your connection.");
    setDevCode(data.devCode ?? null);
    setCode("");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await post(`/api/v1/join/${token}/verify`, { ...details, code });
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      return setError(data?.error?.message ?? "Please try again.");
    }
    router.replace(data.next);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="m-0 flex flex-col gap-3" data-testid="register-code">
        <h2 className="m-0 text-xl font-bold">Enter your code</h2>
        <p className="m-0 text-ink-2">
          We emailed a 6-digit code to <b className="text-ink">{email}</b>. It expires in 10 minutes.
        </p>
        {devCode && (
          <DevBanner>
            <p className="m-0">
              Email isn’t set up on this server, so here’s your code:{" "}
              <b className="text-lg tracking-widest" data-testid="dev-code">
                {devCode}
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
          maxLength={7}
          required
          autoFocus
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center text-2xl tracking-[0.4em]"
        />
        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? "Joining…" : `Join ${patientName}’s circle`}
        </Button>
        <div className="flex justify-between">
          <button type="button" className="min-h-11 text-[15px] font-bold text-primary" onClick={() => sendCode()}>
            Send a new code
          </button>
          <button type="button" className="min-h-11 text-[15px] font-bold text-primary" onClick={() => setStep("details")}>
            Change my details
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="m-0 flex flex-col gap-3" data-testid="register-form" noValidate>
      <FormError message={error} />
      <Label htmlFor="r-name">Your name</Label>
      <Input id="r-name" autoComplete="name" required maxLength={60} placeholder="e.g. Tom" value={name} onChange={(e) => setName(e.target.value)} />
      <Label htmlFor="r-email">Email</Label>
      <EmailInput id="r-email" value={email} onChange={setEmail} error={fieldErrors.email} />
      <Label htmlFor="r-phone">
        Mobile number <span className="font-normal text-ink-3">(optional)</span>
      </Label>
      <PhoneInput id="r-phone" value={null} onChange={setPhone} error={fieldErrors.phone} testId="r-phone" />
      <p className="m-0 text-sm text-ink-3">You can sign in later with this email or number.</p>
      <RolePicker value={role} onChange={setRole} />
      <Button type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Sending…" : "Email me a code"}
      </Button>
    </form>
  );
}

/** Already signed in but not in this circle: pick who you are and join. */
export function JoinAsForm({ token, patientName }: { token: string; patientName: string }) {
  const router = useRouter();
  const [role, setRole] = useState<JoinRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function join() {
    setBusy(true);
    setError(null);
    const res = await post(`/api/v1/join/${token}`, { role });
    if (!res?.ok) {
      setBusy(false);
      return setError("Please try again.");
    }
    router.replace("/home");
    router.refresh();
  }
  return (
    <div className="flex flex-col gap-3">
      <RolePicker value={role} onChange={setRole} />
      <FormError message={error} />
      <Button onClick={join} disabled={busy} className="w-full" data-testid="join-circle">
        {busy ? "Joining…" : `Join ${patientName}’s circle`}
      </Button>
    </div>
  );
}
