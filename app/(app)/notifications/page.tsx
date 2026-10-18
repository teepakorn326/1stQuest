import Link from "next/link";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { timeAgo } from "@/lib/activityText";
import { requirePageUser } from "@/lib/auth/session";
import { listNotifications, markAllRead, type NotifyKind } from "@/lib/db/queries/notifications";
import { NOTIFY_VERB } from "@/lib/notify";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requirePageUser("/notifications");
  const items = await listNotifications(user.id);
  if (items.some((n) => !n.read_at)) await markAllRead(user.id);

  return (
    <main className="flex flex-col">
      <PageHeader title="Notifications" backHref="/home" />
      <div className="flex flex-col gap-2 px-5 pt-2 pb-5" data-testid="notifications">
        {items.length === 0 && (
          <p className="m-0 rounded-2xl border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">
            When the owner posts a wish or a card, it shows up here.
          </p>
        )}
        {items.map((n) => (
          <Link
            key={n.id}
            href={n.url}
            className={clsx(
              "flex gap-3 rounded-2xl border bg-surface px-4 py-3 text-ink no-underline hover:text-ink",
              n.read_at ? "border-line" : "border-accent bg-primary-soft",
            )}
          >
            <Avatar name={n.actor_name} seed={n.actor_id ?? n.id} size={40} />
            <span className="flex flex-col gap-0.5">
              <span className="text-base leading-snug">
                <b>{n.actor_name ?? "A caretaker"}</b> {NOTIFY_VERB[n.kind as NotifyKind] ?? "posted"}: <b>{n.title}</b>
              </span>
              <span className="text-sm text-ink-3">
                {n.patient_name}’s circle · {timeAgo(n.created_at)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
