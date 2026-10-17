import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { WishForm } from "@/components/WishForm";
import { canSeeWish } from "@/lib/authz";
import { requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { findWishForMember } from "@/lib/db/queries/wishes";

export const dynamic = "force-dynamic";

export default async function EditWishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/wishes/${id}/edit`);
  const wish = /^[0-9a-f-]{36}$/i.test(id) ? await findWishForMember(id, user.id) : null;
  if (!wish || !canSeeWish({ userId: user.id, role: wish.viewer_role }, wish, wish.viewer_ids)) notFound();
  if (wish.author_id !== user.id) redirect(`/wishes/${id}`);
  const members = (await listMembers(wish.circle_id)).filter((m) => m.user_id !== user.id);

  return (
    <main className="flex flex-col">
      <PageHeader title="Change wish" backHref={`/wishes/${id}`} />
      <WishForm
        circleId={wish.circle_id}
        wishId={wish.id}
        members={members}
        initial={{ text: wish.text, category: wish.category, visibility: wish.visibility, viewerIds: wish.viewer_ids }}
      />
    </main>
  );
}
