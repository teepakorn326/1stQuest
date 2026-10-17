"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertIcon, CheckIcon, LockIcon } from "@/components/icons";
import type { QuestStatus } from "@/lib/db/types";

const STATUS = {
  done: { label: "Done", className: "bg-cta text-cta-ink" },
  in_progress: { label: "In progress", className: "bg-primary-soft text-primary-hover" },
  open: { label: "Open", className: "bg-tint text-ink-2" },
  locked: { label: "Locked", className: "bg-tint text-ink-3" },
} as const;

export type QuestView = {
  id: string;
  title: string;
  status: QuestStatus;
  needsCareTeam: boolean;
  claimerName: string | null;
  mine: boolean;
  can: { claim: boolean; release: boolean; done: boolean };
};

export function QuestItem({ q }: { q: QuestView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "claim" | "release" | "done") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/quests/${q.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) setError(data?.error?.message ?? "Please try again.");
    router.refresh();
    setBusy(false);
  }

  const who = q.status === "open" ? "Open" : q.status === "locked" ? "Waiting" : q.mine ? "You" : (q.claimerName ?? "Someone");

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface px-3.5 py-3" data-testid="quest" data-status={q.status}>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <span className={clsx("text-base font-bold", q.status === "done" && "text-ink-2")}>{q.title}</span>
          <span className="flex items-center gap-1 text-sm text-ink-3">
            {who}
            {q.needsCareTeam && (
              <>
                {" · "}
                <AlertIcon size={14} className="text-[#8A6414]" /> care team
              </>
            )}
          </span>
        </div>
        {q.can.claim ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => act("claim")}
            className="h-11 rounded-xl border-[1.5px] border-primary bg-surface px-3.5 text-[15px] font-bold whitespace-nowrap text-primary disabled:opacity-60"
          >
            {busy ? "…" : "I’ll take this"}
          </button>
        ) : q.status === "locked" ? (
          <button
            type="button"
            disabled
            title="Share this wish to let others help"
            className="flex h-11 items-center gap-1.5 rounded-xl border-[1.5px] border-field bg-surface px-3 text-[15px] font-bold whitespace-nowrap text-ink-3"
          >
            <LockIcon size={16} /> I’ll take this
          </button>
        ) : (
          <span className={clsx("flex items-center gap-1 rounded-xl px-2.5 py-1 text-[13px] font-bold", STATUS[q.status].className)}>
            {q.status === "done" && <CheckIcon size={14} />}
            {STATUS[q.status].label}
          </span>
        )}
      </div>
      {q.status === "locked" && <p className="m-0 text-sm text-ink-3">Share this wish to let others help.</p>}
      {(q.can.done || q.can.release) && (
        <div className="flex gap-2">
          {q.can.done && (
            <button type="button" disabled={busy} onClick={() => act("done")} className="h-11 flex-1 rounded-xl bg-cta text-[15px] font-bold text-cta-ink disabled:opacity-60">
              Mark done
            </button>
          )}
          {q.can.release && (
            <button type="button" disabled={busy} onClick={() => act("release")} className="h-11 rounded-xl px-3 text-[15px] font-bold text-primary disabled:opacity-60">
              Let someone else take it
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-warm-ink">
          {error}
        </p>
      )}
    </div>
  );
}
