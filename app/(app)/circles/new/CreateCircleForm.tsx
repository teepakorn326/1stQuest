"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CameraIcon } from "@/components/icons";
import { MobilityPicker } from "@/components/MobilityPicker";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label, Textarea } from "@/components/ui/Field";
import type { Mobility } from "@/lib/db/types";

export function CreateCircleForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobility, setMobility] = useState<Mobility>("short_walks_with_help");
  const [notes, setNotes] = useState("");
  const [self, setSelf] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = name.trim() || "them";

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("patientName", name);
    fd.set("mobility", mobility);
    fd.set("mobilityNotes", notes);
    fd.set("setUpByPatient", String(self));
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
    <form onSubmit={submit} className="m-0 flex flex-1 flex-col">
      <div className="flex flex-col gap-[22px] px-5 pt-2 pb-5">
        <p className="m-0 text-base text-ink-2">
          A circle is built around one person. Family, friends and their doctor join to help with their wishes.
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

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2.5 p-0 text-base font-bold">I am</legend>
          {[
            { v: true, label: `${who === "them" ? "The person" : who}, setting this up for myself` },
            { v: false, label: `Someone setting it up for ${who}` },
          ].map((o) => (
            <label
              key={String(o.v)}
              className={clsx(
                "flex min-h-12 items-center gap-3 rounded-[14px] border-[1.5px] bg-surface px-3.5 text-base",
                self === o.v ? "border-primary" : "border-field",
              )}
            >
              <input type="radio" name="self" checked={self === o.v} onChange={() => setSelf(o.v)} className="h-5 w-5 accent-primary" />
              {o.label}
            </label>
          ))}
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
