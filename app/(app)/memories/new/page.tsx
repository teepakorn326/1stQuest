import { redirect } from "next/navigation";
import { manages } from "@/lib/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddMomentsForm } from "@/app/(app)/wishes/[id]/moments/AddMomentsForm";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { CATEGORIES, type Category } from "@/lib/db/types";
import { realtimeConfig } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export default async function ShareMemoryPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const user = await requirePageUser("/memories/new");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  if (circle.mode !== "memorial" || !manages(circle.role)) redirect("/home");
  const raw = (await searchParams).category;
  const initialCategory = CATEGORIES.includes(raw as Category) ? (raw as Category) : null;

  return (
    <main className="flex flex-col">
      <PageHeader title="Share a memory" backHref="/home" />
      <p className="m-0 -mt-1 px-[68px] text-sm text-ink-3">For {circle.patient_name}’s book</p>
      <AddMomentsForm target={{ kind: "memory", initialCategory }} circleId={circle.id} patientName={circle.patient_name} storage={realtimeConfig()} />
    </main>
  );
}
