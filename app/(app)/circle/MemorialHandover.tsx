"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, Label } from "@/components/ui/Field";

type Action = "switch" | "ask" | "confirm" | "cancel";

function useAction(circleId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: Action) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/circles/${circleId}/handover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "Please try again.");
    if (action === "switch") router.replace("/home");
    router.refresh();
  }
  return { busy, error, run };
}

/** A button that asks "are you sure?" in place before doing something that can't be taken back lightly. */
function TwoStep({
  label,
  confirmLabel,
  note,
  onConfirm,
  busy,
  variant = "secondary",
  testId,
}: {
  label: string;
  confirmLabel: string;
  note: string;
  onConfirm: () => void;
  busy: boolean;
  variant?: "primary" | "secondary";
  testId: string;
}) {
  const [sure, setSure] = useState(false);
  if (!sure)
    return (
      <Button variant={variant} className="w-full" onClick={() => setSure(true)} data-testid={testId}>
        {label}
      </Button>
    );
  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-tint p-3">
      <p className="m-0 text-[15px] text-ink-2">{note}</p>
      <Button className="w-full" disabled={busy} onClick={onConfirm} data-testid={`${testId}-yes`}>
        {busy ? "One moment…" : confirmLabel}
      </Button>
      <button type="button" className="min-h-11 text-[15px] font-bold text-primary" onClick={() => setSure(false)}>
        Not now
      </button>
    </div>
  );
}

export type HandoverView = {
  circleId: string;
  patientName: string;
  ownerName: string;
  role: "owner" | "family" | "doctor";
  can: { switch: boolean; ask: boolean; confirm: boolean; cancel: boolean };
  open: { requesterName: string; confirmerName: string | null; takesEffectAt: string | null; mine: boolean } | null;
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** What each person sees about turning the book into a memorial album when the owner can't. */
export function MemorialHandover({ v }: { v: HandoverView }) {
  const { busy, error, run } = useAction(v.circleId);
  const { open, can } = v;
  const name = v.patientName;

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4" data-testid="memorial-handover">
      <h2 className="m-0 text-base font-bold">If {v.role === "owner" ? "you can’t look after the book" : `${v.ownerName} can’t look after the book`}</h2>

      {open && (
        <div className="flex flex-col gap-1 rounded-[14px] bg-[#FFF7E8] px-3.5 py-3 text-[15px] text-[#5C4310]" role="status" data-testid="memorial-request">
          {open.takesEffectAt ? (
            <>
              <b>
                {name}’s book becomes a memorial album on {day(open.takesEffectAt)}.
              </b>
              <span>
                {open.requesterName} asked and {open.confirmerName ?? "another family member"} confirmed. {v.role === "owner" ? "If you’re still here, cancel it below." : `${v.ownerName} can still cancel it until then.`}
              </span>
            </>
          ) : (
            <>
              <b>{open.mine ? "You asked" : `${open.requesterName} asked`} to turn {name}’s book into a memorial album.</b>
              <span>
                {can.confirm
                  ? `If ${name} has died, confirm below. It then happens in 7 days, and ${v.ownerName} can cancel until then.`
                  : "Another family member needs to confirm. Then it happens in 7 days unless the owner cancels."}
              </span>
            </>
          )}
        </div>
      )}

      {can.switch && (
        <>
          <p className="m-0 text-[15px] text-ink-2">
            {v.ownerName} chose you to look after {name}’s book. If {name} has died and {v.ownerName} can’t do it, you can turn the book into a memorial album. You’ll become the circle’s owner.
          </p>
          <TwoStep
            label="Turn into a memorial album"
            confirmLabel="Yes, turn it into a memorial album"
            note={`Everyone in the circle will be told. Nothing is deleted, and you can undo it for 30 days.`}
            onConfirm={() => run("switch")}
            busy={busy}
            testId="handover-switch"
          />
        </>
      )}

      {can.confirm && (
        <TwoStep
          label="Confirm the memorial album"
          confirmLabel="Yes, confirm"
          note={`Only confirm if ${name} has died. ${v.ownerName} will get a message and can cancel for 7 days.`}
          onConfirm={() => run("confirm")}
          busy={busy}
          variant="primary"
          testId="handover-confirm"
        />
      )}

      {can.ask && !can.switch && (
        <>
          <p className="m-0 text-[15px] text-ink-2">
            If {name} has died and {v.ownerName} can’t turn the book into a memorial album, two family members can do it together. One asks, another confirms, and it happens 7 days later unless {v.ownerName} cancels. The one who asked becomes the circle’s owner.
          </p>
          <TwoStep
            label="Ask to turn it into a memorial album"
            confirmLabel="Yes, ask"
            note={`The family and ${v.ownerName} will get a message. Another family member needs to confirm.`}
            onConfirm={() => run("ask")}
            busy={busy}
            testId="handover-ask"
          />
        </>
      )}

      {can.cancel && (
        <Button variant={v.role === "owner" ? "primary" : "secondary"} className="w-full" disabled={busy} onClick={() => run("cancel")} data-testid="handover-cancel">
          {v.role === "owner" ? "Cancel, I’m still here" : "Withdraw the request"}
        </Button>
      )}
      <FormError message={error} />
    </section>
  );
}

/** Owner: choose the family member who can turn the book into a memorial album if you can't. */
export function TrustedForm({
  circleId,
  patientName,
  family,
  trustedUserId,
  nudge,
}: {
  circleId: string;
  patientName: string;
  family: { id: string; name: string }[];
  trustedUserId: string | null;
  nudge: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(trustedUserId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/v1/circles/${circleId}/trusted`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: value || null }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "Please try again.");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="m-0 flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-4" data-testid="trusted-form">
      <Label htmlFor="trusted">Trusted person</Label>
      <p className="m-0 text-[15px] text-ink-2">
        {nudge ? "Please choose someone. " : ""}If {patientName} dies and you can’t turn the book into a memorial album, this family member can do it straight away and look after the book.
      </p>
      {family.length === 0 ? (
        <p className="m-0 text-sm text-ink-3">Invite a family member first.</p>
      ) : (
        <>
          <select
            id="trusted"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-[52px] rounded-[14px] border-[1.5px] border-field bg-surface px-3 text-base"
          >
            <option value="">No one yet</option>
            {family.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <FormError message={error} />
          {saved && (
            <p className="m-0 text-sm text-primary" role="status">
              Saved.
            </p>
          )}
          <Button type="submit" variant="secondary" disabled={busy || value === (trustedUserId ?? "")} className="w-full">
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      )}
    </form>
  );
}
