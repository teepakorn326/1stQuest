import Link from "next/link";
import { manages } from "@/lib/authz";
import { redirect } from "next/navigation";
import { ChatIcon, PlusIcon } from "@/components/icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { realtimeConfig } from "@/lib/realtime";
import { WishRow } from "@/components/WishRow";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listVisibleWishes } from "@/lib/db/queries/wishes";

export const dynamic = "force-dynamic";

export default async function WishesPage() {
  const user = await requirePageUser("/wishes");
  const circle = await getActiveCircle(user.id);
  if (!circle || circle.mode === "memorial") redirect("/home");
  const wishes = await listVisibleWishes(circle.id, user.id, 100);

  return (
    <main className="flex flex-col">
      <PageHeader title={`${circle.patient_name}’s wishes`} />
      <LiveRefresh circleId={circle.id} realtime={realtimeConfig()} />
      <div className="flex flex-col gap-4 px-5 pt-2 pb-5">
        {manages(circle.role) && (
        <>
        <ButtonLink href="/wishes/new">
          <PlusIcon size={22} /> Add a wish
        </ButtonLink>
        <Link
          href="/wishes/talk"
          className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3.5 text-ink no-underline hover:text-ink"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ChatIcon />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-bold">Talk it through</span>
            <span className="text-sm text-ink-3">Not sure where to start? A few gentle questions can help.</span>
          </div>
        </Link>
        </>
        )}
        <section className="flex flex-col gap-2.5" data-testid="wish-list">
          {wishes.length === 0 ? (
            <p className="m-0 rounded-[14px] border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">
              No wishes yet. There’s no rush. Add one whenever something comes to mind.
            </p>
          ) : (
            wishes.map((w) => <WishRow key={w.id} wish={w} />)
          )}
        </section>
      </div>
    </main>
  );
}
