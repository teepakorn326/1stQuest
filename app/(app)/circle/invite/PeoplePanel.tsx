"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { PhoneInput } from "@/components/PhoneInput";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";
import type { Role } from "@/lib/db/types";

const ROLE_LABEL: Record<Role, string> = { owner: "Owner", caretaker: "Caretaker", viewer: "Viewer" };
const ROLE_HELP = {
  viewer: "Sees the wishes and cards, leaves messages and takes quests.",
  caretaker: "Can also post wishes, cards, photos and voice notes, and add people.",
} as const;

/** Add someone by name, email and mobile number; they sign in with either and open the circle's link. */
export function AddPersonForm({ circleId }: { circleId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"viewer" | "caretaker">("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAdded(null);
    const res = await fetch(`/api/v1/circles/${circleId}/people`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, phone, role }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "Please try again.");
    setAdded(name.trim());
    setName("");
    setEmail("");
    setPhone("");
    setFormKey((k) => k + 1); // resets the phone field
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="m-0 flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-4" data-testid="add-person">
      <h2 className="m-0 text-lg font-bold">Add someone</h2>
      <Label htmlFor="p-name">Name</Label>
      <Input id="p-name" required maxLength={60} placeholder="e.g. Tom" value={name} onChange={(e) => setName(e.target.value)} />
      <Label htmlFor="p-email">Email</Label>
      <Input id="p-email" type="email" inputMode="email" required placeholder="tom@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Label htmlFor="p-phone">
        Mobile number <span className="font-normal text-ink-3">(optional)</span>
      </Label>
      <PhoneInput key={formKey} id="p-phone" value={null} onChange={setPhone} testId="p-phone" />
      <fieldset className="m-0 mt-1 border-0 p-0">
        <legend className="mb-2 p-0 text-base font-bold">They can</legend>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-tint p-1">
          {(["viewer", "caretaker"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={clsx("h-11 rounded-[11px] text-[15px]", role === r ? "bg-surface font-bold text-ink shadow-[0_1px_2px_rgba(28,43,58,0.12)]" : "text-ink-2")}
            >
              {r === "viewer" ? "View and help" : "Look after it"}
            </button>
          ))}
        </div>
        <p className="mt-2 mb-0 text-sm text-ink-3">{ROLE_HELP[role]}</p>
      </fieldset>
      <FormError message={error} />
      {added && (
        <p className="m-0 text-sm text-primary" role="status">
          Added {added}. Send them the link or QR code below.
        </p>
      )}
      <Button type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Adding…" : "Add to the circle"}
      </Button>
    </form>
  );
}

/** The circle's one link and QR code. */
export function SharePanel({ url, qr, patientName }: { url: string; qr: string; patientName: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <section className="flex flex-col gap-3" data-testid="share-panel">
      <h2 className="m-0 text-lg font-bold">Send them the link</h2>
      <p className="m-0 text-[15px] text-ink-2">
        Anyone you’ve added can open it, sign in with their email or mobile number, and see {patientName}’s circle. People you haven’t added can’t get in.
      </p>
      <div className="flex flex-col items-center gap-3 rounded-[18px] border border-line bg-surface px-5 py-6">
        <div role="img" aria-label="QR code for the circle’s link" className="h-[200px] w-[200px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="m-0 text-center text-[15px] text-ink-2">They can scan this with their phone camera</p>
      </div>
      <div className="flex gap-2">
        <label htmlFor="invite-link" className="sr-only">
          Circle link
        </label>
        <input
          id="invite-link"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          data-testid="invite-link"
          className="h-[52px] min-w-0 flex-1 rounded-[14px] border-[1.5px] border-field bg-surface px-3.5 text-base text-ink"
        />
        <button type="button" onClick={copy} className="h-[52px] rounded-[14px] bg-cta px-[18px] text-base font-bold text-cta-ink">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}

type Person = { id: string; name: string; email: string; phone: string | null; role: Role; you: boolean };

/** Everyone in the circle, with a way for the owner and caretakers to take someone out. */
export function PeopleList({ circleId, people, canRemove }: { circleId: string; people: Person[]; canRemove: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setError(null);
    const res = await fetch(`/api/v1/circles/${circleId}/people/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error?.message ?? "Please try again.");
    }
    setConfirm(null);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-lg font-bold">In the circle</h2>
      <ul className="m-0 flex list-none flex-col rounded-[14px] border border-line bg-surface p-0" data-testid="people">
        {people.map((p, i) => (
          <li key={p.id} className={clsx("flex flex-col gap-2 px-3.5 py-3", i < people.length - 1 && "border-b border-[#F6EBDA]")}>
            <div className="flex items-center gap-3">
              <Avatar name={p.name} seed={p.id} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base">
                  {p.name}
                  {p.you && " (you)"}
                </span>
                <span className="truncate text-sm text-ink-3">{[p.email, p.phone].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="text-sm text-ink-3">{ROLE_LABEL[p.role]}</span>
            </div>
            {canRemove && !p.you && p.role !== "owner" && (
              confirm === p.id ? (
                <div className="flex items-center gap-3 pl-[52px] text-[15px]">
                  <span className="flex-1 text-ink-2">Take {p.name} out of the circle?</span>
                  <button type="button" className="min-h-10 font-bold text-warm-ink" onClick={() => remove(p.id)}>
                    Remove
                  </button>
                  <button type="button" className="min-h-10 font-bold text-primary" onClick={() => setConfirm(null)}>
                    Keep
                  </button>
                </div>
              ) : (
                <button type="button" className="min-h-9 self-end text-sm font-bold text-primary" onClick={() => setConfirm(p.id)}>
                  Remove
                </button>
              )
            )}
          </li>
        ))}
      </ul>
      <FormError message={error} />
    </section>
  );
}
