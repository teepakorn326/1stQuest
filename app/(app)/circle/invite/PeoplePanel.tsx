"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { FormError } from "@/components/ui/Field";
import { ROLE_LABEL, type Role } from "@/lib/db/types";

/** The circle's one link and QR code. Whoever opens it can register and join. */
export function SharePanel({ url, qr, patientName }: { url: string; qr: string; patientName: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <section className="flex flex-col gap-3" data-testid="share-panel">
      <p className="m-0 text-[15px] text-ink-2">
        Send this to family, friends and {patientName}’s health professionals. They open it, add their name, email and mobile number, say who they are,
        and they’re in. You can make someone a caretaker, or remove them, below.
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

/** Everyone in the circle. The owner and caretakers can make someone a caretaker (or not), or remove them. */
export function PeopleList({ circleId, people, canManage }: { circleId: string; people: Person[]; canManage: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(id: string, init: RequestInit) {
    setError(null);
    setBusy(id);
    const res = await fetch(`/api/v1/circles/${circleId}/people/${id}`, init).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error?.message ?? "Please try again.");
    }
    setConfirm(null);
    router.refresh();
  }
  const setRole = (id: string, role: Role) =>
    call(id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-lg font-bold">In the circle</h2>
      <ul className="m-0 flex list-none flex-col rounded-[14px] border border-line bg-surface p-0" data-testid="people">
        {people.map((p, i) => (
          <li key={p.id} className={clsx("flex flex-col gap-2 px-3.5 py-3", i < people.length - 1 && "border-b border-[#F6EBDA]")} data-testid="person">
            <div className="flex items-center gap-3">
              <Avatar name={p.name} seed={p.id} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base">
                  {p.name}
                  {p.you && " (you)"}
                </span>
                <span className="truncate text-sm text-ink-3">{[p.email, p.phone].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="shrink-0 text-right text-sm text-ink-3">{ROLE_LABEL[p.role]}</span>
            </div>
            {canManage && !p.you && p.role !== "owner" && (
              confirm === p.id ? (
                <div className="flex items-center gap-3 pl-[52px] text-[15px]">
                  <span className="flex-1 text-ink-2">Take {p.name} out of the circle?</span>
                  <button type="button" className="min-h-10 font-bold text-warm-ink" onClick={() => call(p.id, { method: "DELETE" })}>
                    Remove
                  </button>
                  <button type="button" className="min-h-10 font-bold text-primary" onClick={() => setConfirm(null)}>
                    Keep
                  </button>
                </div>
              ) : (
                <div className="flex justify-end gap-4 text-sm font-bold">
                  {p.role === "caretaker" ? (
                    <button type="button" disabled={busy === p.id} className="min-h-9 text-primary" onClick={() => setRole(p.id, "viewer")}>
                      Make a viewer
                    </button>
                  ) : (
                    <button type="button" disabled={busy === p.id} className="min-h-9 text-primary" onClick={() => setRole(p.id, "caretaker")} data-testid="make-caretaker">
                      Make a caretaker
                    </button>
                  )}
                  <button type="button" className="min-h-9 text-primary" onClick={() => setConfirm(p.id)}>
                    Remove
                  </button>
                </div>
              )
            )}
          </li>
        ))}
      </ul>
      <FormError message={error} />
    </section>
  );
}
