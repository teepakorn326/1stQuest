import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { NotificationToaster } from "@/components/NotificationToaster";
import { realtimeConfig } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  if (!user.name) redirect("/welcome");
  const circle = await getActiveCircle(user.id);
  return (
    <div className="relative mx-auto min-h-dvh max-w-[480px] pb-[96px]">
      {children}
      <NotificationToaster userId={user.id} realtime={realtimeConfig()} />
      <BottomNav memorial={circle?.mode === "memorial"} />
    </div>
  );
}
