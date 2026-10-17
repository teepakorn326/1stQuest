import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { canSeeWish } from "@/lib/authz";
import { requirePageUser } from "@/lib/auth/session";
import { findWishForMember } from "@/lib/db/queries/wishes";
import { realtimeConfig } from "@/lib/realtime";
import { AddMomentsForm } from "./AddMomentsForm";

export const dynamic = "force-dynamic";

export default async function AddMomentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/wishes/${id}/moments`);
  const wish = /^[0-9a-f-]{36}$/i.test(id) ? await findWishForMember(id, user.id) : null;
  if (!wish || !canSeeWish({ userId: user.id, role: wish.viewer_role }, wish, wish.viewer_ids)) notFound();

  return (
    <main className="flex flex-col">
      <PageHeader title="Add moments" backHref={`/wishes/${wish.id}`} />
      <p className="m-0 -mt-1 px-[68px] text-sm text-ink-3">{wish.text}</p>
      <AddMomentsForm wishId={wish.id} circleId={wish.circle_id} storage={realtimeConfig()} />
    </main>
  );
}
