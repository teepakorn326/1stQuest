import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { requirePageUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  if (!user.name) redirect("/welcome");
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-[96px]">
      {children}
      <BottomNav />
    </div>
  );
}
