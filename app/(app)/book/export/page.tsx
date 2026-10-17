import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { ExportForm } from "./ExportForm";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const user = await requirePageUser("/book/export");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  return (
    <main className="flex flex-col">
      <PageHeader title="Make a copy of the book" backHref="/book" />
      <ExportForm circleId={circle.id} />
    </main>
  );
}
