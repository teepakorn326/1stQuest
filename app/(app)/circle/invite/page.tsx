import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { canInvite } from "@/lib/authz";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { appUrl } from "@/lib/env";
import { qrSvg } from "@/lib/qr";
import { PeopleList, SharePanel } from "./PeoplePanel";

export const dynamic = "force-dynamic";

/** Share the circle's one link or QR code; manage who's in (make caretakers, remove people). */
export default async function AddPeoplePage() {
  const user = await requirePageUser("/circle/invite");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  if (!canInvite({ userId: user.id, role: circle.role })) redirect("/circle");

  const url = `${appUrl()}/join/${circle.join_token}`;
  const [members, qr] = await Promise.all([listMembers(circle.id), qrSvg(url)]);

  return (
    <main className="flex flex-col">
      <PageHeader title="Invite people" backHref="/circle" />
      <div className="flex flex-col gap-6 px-5 pt-2 pb-5">
        <SharePanel url={url} qr={qr} patientName={circle.patient_name} />
        <PeopleList
          circleId={circle.id}
          canManage
          people={members.map((m) => ({ id: m.user_id, name: m.name ?? m.email, email: m.email, phone: m.phone, role: m.role, you: m.user_id === user.id }))}
        />
      </div>
    </main>
  );
}
