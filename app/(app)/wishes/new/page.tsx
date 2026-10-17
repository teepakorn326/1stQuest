import Link from "next/link";
import { redirect } from "next/navigation";
import { CloseIcon } from "@/components/icons";
import { WishForm } from "@/components/WishForm";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { CATEGORIES, type Category } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function NewWishPage({ searchParams }: { searchParams: Promise<{ text?: string; category?: string }> }) {
  const user = await requirePageUser("/wishes/new");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  const sp = await searchParams;
  const members = (await listMembers(circle.id)).filter((m) => m.user_id !== user.id);
  const category = CATEGORIES.includes(sp.category as Category) ? (sp.category as Category) : null;

  return (
    <main className="flex flex-col">
      <header className="flex items-center gap-2 px-3 pt-4 pb-2">
        <Link href="/wishes" aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:text-ink">
          <CloseIcon />
        </Link>
        <h1 className="m-0 text-[22px] font-bold">New wish</h1>
      </header>
      <WishForm
        circleId={circle.id}
        members={members}
        initial={{ text: (sp.text ?? "").slice(0, 500), category, visibility: "circle", viewerIds: [] }}
      />
    </main>
  );
}
