"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

type Plan = { text: string; mobilityLabel: string; needsCareTeam: boolean; careTeamNote: string | null };

function Skeleton() {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" role="status" aria-live="polite" data-testid="planning">
      <h2 className="m-0 text-base font-bold">Planning…</h2>
      <div className="h-4 w-full animate-pulse rounded bg-tint" />
      <div className="h-4 w-11/12 animate-pulse rounded bg-tint" />
      <div className="h-4 w-3/5 animate-pulse rounded bg-tint" />
      <p className="m-0 text-sm text-ink-3">Thinking about what would make this easy and lovely. This takes a few seconds.</p>
    </section>
  );
}

export function PlanPanel({ wishId, plan, canPlan }: { wishId: string; plan: Plan | null; canPlan: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function makePlan() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/wishes/${wishId}/plan`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error?.message ?? "We couldn’t make a plan just now. Your wish is safe; try again in a moment.");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  const errorBox = error && (
    <div role="alert" className="flex flex-col gap-2 rounded-[14px] bg-warm px-4 py-3 text-[15px] text-warm-ink">
      {error}
      <button type="button" onClick={makePlan} className="self-start font-bold text-primary">
        Try again
      </button>
    </div>
  );

  if (busy) return <Skeleton />;

  if (!plan) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-accent bg-surface p-4">
        <h2 className="m-0 text-base font-bold">The plan</h2>
        <p className="m-0 text-[15px] text-ink-2">
          {canPlan ? "Get a gentle plan and a few quests the family can share, fitted to how things are getting around." : "No plan yet."}
        </p>
        {canPlan && (
          <Button onClick={makePlan} className="w-full" data-testid="make-plan">
            Make a plan
          </Button>
        )}
        {errorBox}
      </section>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4" data-testid="plan">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-bold">The plan</h2>
          {canPlan && (
            <button type="button" onClick={makePlan} className="flex h-9 items-center rounded-[10px] px-2.5 text-[15px] font-bold text-primary">
              Update plan
            </button>
          )}
        </div>
        <p className="m-0 text-base text-[#33475A]">{plan.text}</p>
        <span className="text-sm text-ink-3">Planned for: {plan.mobilityLabel}</span>
      </section>
      {errorBox}
      {plan.needsCareTeam && (
        <div className="flex gap-3 rounded-[14px] border border-[#EAD7AE] bg-[#FFF7E8] px-4 py-3.5" data-testid="care-team">
          <AlertIcon size={22} className="shrink-0 text-[#8A6414]" />
          <p className="m-0 text-[15px] text-[#5C4310]">
            <b>Check with the care team first</b> {plan.careTeamNote ?? "before doing this plan."}
          </p>
        </div>
      )}
    </>
  );
}
