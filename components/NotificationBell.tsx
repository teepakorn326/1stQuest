import Link from "next/link";
import { BellIcon } from "@/components/icons";

export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-primary"
      data-testid="bell"
    >
      <BellIcon size={22} />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1 text-xs font-bold text-cta-ink" data-testid="bell-count">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
