import Link from "next/link";
import { CategoryIcon, ChevronRight, LockIcon } from "@/components/icons";
import type { WishSummary } from "@/lib/db/queries/wishes";

export function wishSubline(w: WishSummary): string {
  if (w.active_quest?.claimer_name) return `${w.active_quest.claimer_name} is on “${w.active_quest.title}”`;
  if (w.open_quests === 1) return "A quest is waiting for someone";
  if (w.open_quests > 1) return `${w.open_quests} quests waiting for someone`;
  if (w.visibility === "private") return "Just for you for now";
  if (w.visibility === "chosen") return "Shared with people you chose";
  return "Ready for a plan";
}

export function WishRow({ wish }: { wish: WishSummary }) {
  return (
    <Link
      href={`/wishes/${wish.id}`}
      className="flex items-center gap-3.5 rounded-[14px] border border-line bg-surface p-3.5 text-ink no-underline hover:text-ink"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <CategoryIcon category={wish.category} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-base font-bold">{wish.text}</span>
        <span className="flex items-center gap-1 text-sm text-ink-3">
          {wish.visibility !== "circle" && <LockIcon size={14} />}
          {wishSubline(wish)}
        </span>
      </div>
      <ChevronRight size={20} className="text-ink-3" />
    </Link>
  );
}
