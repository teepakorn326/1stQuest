import { redirect } from "next/navigation";
import { LiveRefresh } from "@/components/LiveRefresh";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { FEED_FILTERS, listActivity, type FeedFilter } from "@/lib/db/queries/activity";
import { realtimeConfig } from "@/lib/realtime";
import { ActivityList } from "./ActivityList";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requirePageUser("/activity");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  const raw = (await searchParams).filter;
  const filter: FeedFilter = raw && raw in FEED_FILTERS ? (raw as FeedFilter) : "all";
  const items = await listActivity(circle.id, user.id, { filter: filter === "all" ? undefined : filter });

  return (
    <main className="flex flex-col">
      <PageHeader title="What’s happening" backHref="/home" />
      <LiveRefresh circleId={circle.id} realtime={realtimeConfig()} />
      <ActivityList
        key={filter}
        circleId={circle.id}
        viewerId={user.id}
        filter={filter}
        initial={items.map((a) => ({ ...a, created_at: a.created_at.toISOString() }))}
      />
    </main>
  );
}
