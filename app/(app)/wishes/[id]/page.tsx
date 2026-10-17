import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon, ChevronLeft, EyeIcon, LockIcon } from "@/components/icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { questTransition } from "@/lib/quests";
import { realtimeConfig } from "@/lib/realtime";
import { PlanPanel } from "./PlanPanel";
import { QuestItem, type QuestView } from "./QuestItem";
import { canSeeWish } from "@/lib/authz";
import { CATEGORY_LABEL, MOBILITY_LABEL } from "@/lib/activityText";
import { requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { findLatestPlan, findWishForMember } from "@/lib/db/queries/wishes";
import { listBookCards } from "@/lib/db/queries/cards";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function WishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/wishes/${id}`);
  const wish = /^[0-9a-f-]{36}$/i.test(id) ? await findWishForMember(id, user.id) : null;
  // Same 404 for "doesn't exist" and "not yours to see".
  if (!wish || !canSeeWish({ userId: user.id, role: wish.viewer_role }, wish, wish.viewer_ids)) notFound();

  const [plan, members, cards] = await Promise.all([
    findLatestPlan(wish.id),
    wish.visibility === "chosen" ? listMembers(wish.circle_id) : [],
    listBookCards(wish.circle_id, user.id, wish.id),
  ]);
  const isAuthor = wish.author_id === user.id;
  const viewer = { userId: user.id, role: wish.viewer_role };
  const canPlan = wish.viewer_role === "owner";
  const quests: QuestView[] = (plan?.quests ?? []).map((q) => {
    const quest = { status: q.status, claimed_by_user_id: q.claimed_by_user_id };
    const can = (a: "claim" | "release" | "done") => questTransition(a, quest, wish, viewer, wish.viewer_ids).ok;
    return {
      id: q.id,
      title: q.title,
      status: q.status,
      needsCareTeam: q.needs_care_team,
      claimerName: q.claimer_name,
      mine: q.claimed_by_user_id === user.id,
      can: { claim: can("claim"), release: can("release"), done: can("done") },
    };
  });
  const chosenNames = members.filter((m) => wish.viewer_ids.includes(m.user_id)).map((m) => m.name ?? m.email);
  const seenBy =
    wish.visibility === "private"
      ? "Only you can see this wish."
      : wish.visibility === "chosen"
        ? `Shared with ${chosenNames.join(", ") || "people you chose"}${isAuthor ? "" : " and you"}.`
        : "Everyone in the circle can see this wish.";

  return (
    <main className="flex flex-col">
      <LiveRefresh circleId={wish.circle_id} realtime={realtimeConfig()} />
      <header className="flex items-center justify-between px-3 pt-3">
        <Link href="/wishes" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:text-ink">
          <ChevronLeft />
        </Link>
        <span className="flex items-center gap-1.5 rounded-2xl bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary-hover">
          <CategoryIcon category={wish.category} size={18} />
          {CATEGORY_LABEL[wish.category]}
        </span>
        {isAuthor && wish.viewer_role === "owner" ? (
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

        <PlanPanel
          wishId={wish.id}
          canPlan={canPlan}
          plan={
            plan && {
              text: plan.text,
              mobilityLabel: MOBILITY_LABEL[plan.based_on_mobility].toLowerCase(),
              needsCareTeam: plan.needs_care_team,
              careTeamNote: plan.care_team_note,
            }
          }
        />
        {quests.length > 0 && (
          <section className="flex flex-col gap-2" data-testid="quests">
            <h2 className="m-0 mb-0.5 text-lg font-bold">Quests</h2>
            {quests.map((q) => (
              <QuestItem key={q.id} q={q} />
            ))}
          </section>
        )}
        {cards.length > 0 && (
          <section className="flex flex-col gap-2" data-testid="wish-cards">
            <h2 className="m-0 mb-0.5 text-lg font-bold">In the book</h2>
            {cards.map((c) => (
              <Link
                key={c.id}
                href={`/cards/${c.id}`}
                className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-2.5 text-ink no-underline hover:text-ink"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-[#FFD497]">
                  {c.cover_media_id && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/v1/media/${c.cover_media_id}`} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="text-base font-bold">{c.title}</span>
              </Link>
            ))}
          </section>
        )}
      </div>
      {canPlan && (
        <div className="sticky bottom-[76px] mt-auto border-t border-line bg-bg px-5 pt-3 pb-4">
          <ButtonLink href={`/wishes/${wish.id}/moments`} className="w-full">
            We did it, add moments
          </ButtonLink>
        </div>
      )}
    </main>
  );
}
