import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { AlertIcon, CategoryIcon, CheckIcon, ChevronLeft, EyeIcon, LockIcon } from "@/components/icons";
import { canSeeWish } from "@/lib/authz";
import { CATEGORY_LABEL, MOBILITY_LABEL } from "@/lib/activityText";
import { requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { findLatestPlan, findWishForMember } from "@/lib/db/queries/wishes";

export const dynamic = "force-dynamic";

const STATUS = {
  done: { label: "Done", className: "bg-primary text-white" },
  in_progress: { label: "In progress", className: "bg-primary-soft text-primary-hover" },
  open: { label: "Open", className: "bg-tint text-ink-2" },
  locked: { label: "Locked", className: "bg-tint text-ink-3" },
} as const;

export default async function WishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/wishes/${id}`);
  const wish = /^[0-9a-f-]{36}$/i.test(id) ? await findWishForMember(id, user.id) : null;
  // Same 404 for "doesn't exist" and "not yours to see".
  if (!wish || !canSeeWish({ userId: user.id, role: wish.viewer_role }, wish, wish.viewer_ids)) notFound();

  const [plan, members] = await Promise.all([findLatestPlan(wish.id), wish.visibility === "chosen" ? listMembers(wish.circle_id) : []]);
  const isAuthor = wish.author_id === user.id;
  const chosenNames = members.filter((m) => wish.viewer_ids.includes(m.user_id)).map((m) => m.name ?? m.email);
  const seenBy =
    wish.visibility === "private"
      ? "Only you can see this wish."
      : wish.visibility === "chosen"
        ? `Shared with ${chosenNames.join(", ") || "people you chose"}${isAuthor ? "" : " and you"}.`
        : "Everyone in the circle can see this wish.";

  return (
    <main className="flex flex-col">
      <header className="flex items-center justify-between px-3 pt-3">
        <Link href="/wishes" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:text-ink">
          <ChevronLeft />
        </Link>
        <span className="flex items-center gap-1.5 rounded-2xl bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary-hover">
          <CategoryIcon category={wish.category} size={18} />
          {CATEGORY_LABEL[wish.category]}
        </span>
        {isAuthor ? (
          <Link href={`/wishes/${wish.id}/edit`} className="flex h-11 items-center px-2 text-[15px] font-bold no-underline">
            Change
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </header>

      <div className="flex flex-col gap-3.5 px-5 pt-1 pb-5">
        <h1 className="m-0 text-2xl leading-tight font-bold">{wish.text}</h1>
        <p className="m-0 flex items-center gap-1.5 text-sm text-ink-3">
          {wish.visibility === "circle" ? <EyeIcon size={16} /> : <LockIcon size={16} />}
          {seenBy} Added by {isAuthor ? "you" : (wish.author_name ?? "someone")}.
        </p>

        {plan ? (
          <>
            <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4" data-testid="plan">
              <h2 className="m-0 text-base font-bold">The plan</h2>
              <p className="m-0 text-base text-[#33475A]">{plan.text}</p>
              <span className="text-sm text-ink-3">Planned for: {MOBILITY_LABEL[plan.based_on_mobility].toLowerCase()}</span>
            </section>
            {plan.needs_care_team && (
              <div className="flex gap-3 rounded-[14px] border border-[#EAD7AE] bg-[#FFF7E8] px-4 py-3.5">
                <AlertIcon size={22} className="shrink-0 text-[#8A6414]" />
                <p className="m-0 text-[15px] text-[#5C4310]">
                  <b>Check with the care team first</b> before doing this plan.
                </p>
              </div>
            )}
            <section className="flex flex-col gap-2">
              <h2 className="m-0 mb-0.5 text-lg font-bold">Quests</h2>
              {plan.quests.map((q) => (
                <div key={q.id} className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className={clsx("text-base font-bold", q.status === "done" && "text-ink-2")}>{q.title}</span>
                    <span className="text-sm text-ink-3">
                      {q.claimer_name ?? "Open"}
                      {q.needs_care_team && " · care team"}
                    </span>
                  </div>
                  <span className={clsx("flex items-center gap-1 rounded-xl px-2.5 py-1 text-[13px] font-bold", STATUS[q.status].className)}>
                    {q.status === "done" && <CheckIcon size={14} />}
                    {STATUS[q.status].label}
                  </span>
                </div>
              ))}
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-accent bg-surface p-4 text-[15px] text-ink-2">
            <h2 className="m-0 mb-1 text-base font-bold text-ink">The plan</h2>
            Making a plan together isn’t built yet in this version of the app.
          </section>
        )}
      </div>
    </main>
  );
}
