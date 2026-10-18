"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "@/components/icons";
import { MobilityPicker } from "@/components/MobilityPicker";
import { EmailInput } from "@/components/EmailInput";
import { PhoneInput } from "@/components/PhoneInput";
import { emailProblem, phoneProblem } from "@/lib/validate";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label, Textarea } from "@/components/ui/Field";
import type { Mobility } from "@/lib/db/types";

export function CreateCircleForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobility, setMobility] = useState<Mobility>("short_walks_with_help");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string | null; phone?: string | null }>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = name.trim() || "them";
  const first = name.trim().split(/\s+/).pop() || "their";

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = { email: emailProblem(email), phone: phoneProblem(phone) };
    setFieldErrors(errs);
    if (errs.email || errs.phone) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("patientName", name);
    fd.set("mobility", mobility);
    fd.set("mobilityNotes", notes);
    fd.set("patientEmail", email);
    fd.set("patientPhone", phone);
    if (photo) fd.set("photo", photo);
    const res = await fetch("/api/v1/circles", { method: "POST", body: fd }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error?.message ?? "We couldn’t create the circle. Please try again.");
      setBusy(false);
      return;
    }
    router.replace("/circle/invite");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="m-0 flex flex-1 flex-col" noValidate>
      <div className="flex flex-col gap-[22px] px-5 pt-2 pb-5">
        <p className="m-0 text-base text-ink-2">
          A circle is built around one person. You look after it as a caretaker, and add family, friends and their doctor. They get their own account, so they can sign in too.
        </p>
        <div className="flex items-end gap-3.5">
          <label
            className="relative flex h-[72px] w-[72px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-accent bg-primary-soft text-primary"
            aria-label="Add a photo"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <CameraIcon />
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickPhoto} />
          </label>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="pname">Who is this circle for?</Label>
            <Input id="pname" required maxLength={80} placeholder="e.g. Nana Rose" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="pemail">{name.trim() ? `${who}’s email` : "Their email"}</Label>
          <EmailInput id="pemail" value={email} onChange={setEmail} error={fieldErrors.email} autoComplete="off" />
          <Label htmlFor="pphone" className="mt-1">
            {name.trim() ? `${who}’s mobile number` : "Their mobile number"} <span className="font-normal text-ink-3">(optional)</span>
          </Label>
          <PhoneInput id="pphone" value={null} onChange={setPhone} error={fieldErrors.phone} testId="patient-phone" />
          <p className="m-0 text-sm text-ink-3">This makes {first === "their" ? "their" : `${first}’s`} own account. They sign in with this email or number and a code.</p>
        </div>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 p-0 text-base font-bold">Getting around today</legend>
          <MobilityPicker value={mobility} onChange={setMobility} />
          <label htmlFor="mnotes" className="mt-1 text-[15px] text-ink-2">
            Anything else that helps with planning
          </label>
          <Textarea
            id="mnotes"
            rows={2}
            maxLength={500}
            placeholder="e.g. Gets tired after about 20 minutes. Prefers mornings."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="m-0 text-sm text-ink-3">You can change this any time as things change.</p>
        </fieldset>

        <FormError message={error} />
      </div>
      <div className="sticky bottom-[76px] border-t border-line bg-bg px-5 pt-3 pb-4">
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating…" : "Create circle"}
        </Button>
      </div>
    </form>
  );
}
