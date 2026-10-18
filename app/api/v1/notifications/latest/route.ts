import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { countUnread, latestUnread } from "@/lib/db/queries/notifications";
import { NOTIFY_VERB } from "@/lib/notify";
import type { NotifyKind } from "@/lib/db/queries/notifications";

/** Newest unread notification (for the live pop-up) and the unread count. */
export const GET = route(async () => {
  const user = await requireApiUser();
  const [n, unread] = await Promise.all([latestUnread(user.id), countUnread(user.id)]);
  return NextResponse.json({
    unread,
    latest: n && {
      id: n.id,
      text: `${n.actor_name ?? "A caretaker"} ${NOTIFY_VERB[n.kind as NotifyKind] ?? "posted"}: “${n.title}”`,
      circle: n.patient_name,
      url: n.url,
    },
  });
});
