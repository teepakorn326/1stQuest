"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { activityContext, activityParts, timeAgo } from "@/lib/activityText";
import { groupByDay } from "@/lib/feed";
import type { ActivityItem, FeedFilter } from "@/lib/db/queries/activity";

type Item = Omit<ActivityItem, "created_at"> & { created_at: string };

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "quests", label: "Quests" },
  { key: "cards", label: "Cards" },
  { key: "wishes", label: "Wishes" },
];

export function ActivityList({ circleId, viewerId, filter, initial }: { circleId: string; viewerId: string; filter: FeedFilter; initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [more, setMore] = useState(initial.length === 50);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // Live refresh hands us a fresh first page; keep any older pages already loaded.
  useEffect(() => {
    setItems((old) => {
      const fresh = new Set(initial.map((i) => i.id));
      const oldest = initial.at(-1)?.created_at;
      return [...initial, ...old.filter((i) => !fresh.has(i.id) && oldest !== undefined && i.created_at < oldest)];
    });
    setNow(new Date());
  }, [initial]);

  async function loadMore() {
    const oldest = items.at(-1);
    if (!oldest) return;
    setLoading(true);
    const res = await fetch(`/api/v1/circles/${circleId}/activity?${new URLSearchParams({ before: oldest.created_at, filter })}`).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok) return;
    setItems((cur) => [...cur, ...data.items]);
    setMore(data.items.length === 50);
  }

  const groups = now ? groupByDay(items, now) : [];

  return (
    <>
      <nav aria-label="Filter activity" className="flex gap-2 px-5 pt-1 pb-3">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/activity" : `/activity?filter=${f.key}`}
            aria-current={f.key === filter ? "page" : undefined}
            replace
            className={clsx(
              "flex h-10 items-center rounded-[20px] px-4 text-[15px] no-underline",
              f.key === filter ? "bg-cta font-bold text-cta-ink hover:text-cta-ink" : "border-[1.5px] border-field bg-surface text-ink hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-2.5 px-5 pt-2 pb-5" data-testid="feed">
        {now && items.length === 0 && (
          <p className="m-0 rounded-2xl border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">Nothing here yet.</p>
        )}
        {groups.map((g) => (
          <section key={g.label} className="flex flex-col gap-2.5">
            <h2 className="m-0 text-[15px] font-bold text-ink-2">{g.label}</h2>
            <ul className="m-0 list-none rounded-2xl border border-line bg-surface p-0">
              {g.items.map((a, i) => {
                const { verb, object } = activityParts(a);
                const context = activityContext(a);
                const name = a.actor_id === viewerId ? "You" : (a.actor_name ?? "Someone");
                return (
                  <li key={a.id} className={clsx("flex gap-3 px-4 py-3.5", i < g.items.length - 1 && "border-b border-[#F6EBDA]")}>
                    <Avatar name={a.actor_name ?? a.actor_email} seed={a.actor_id ?? a.id} size={40} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base leading-snug">
                        <b>{name}</b> {verb} {object && <b>{object}</b>}
                      </span>
                      <span className="text-sm text-ink-3">
                        {context && `${context} · `}
                        {timeAgo(new Date(a.created_at), now ?? undefined)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {more && (
          <button type="button" onClick={loadMore} disabled={loading} className="min-h-11 self-center text-[15px] font-bold text-primary">
            {loading ? "Loading…" : "Show earlier"}
          </button>
        )}
      </div>
    </>
  );
}
