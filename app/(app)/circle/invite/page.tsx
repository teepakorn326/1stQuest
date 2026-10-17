import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { canInvite } from "@/lib/authz";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { inviteUrl } from "@/lib/invites";
import { qrSvg } from "@/lib/qr";
import { Avatar } from "@/components/ui/Avatar";
import { InvitePanel } from "./InvitePanel";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { owner: "Owner", family: "Family", doctor: "Care team" } as const;

export default async function InvitePage() {
  const user = await requirePageUser("/circle/invite");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  if (!canInvite({ userId: user.id, role: circle.role })) redirect("/circle");

  const [familyUrl, doctorUrl, members] = await Promise.all([
    inviteUrl(circle.id, "family", user.id),
    inviteUrl(circle.id, "doctor", user.id),
    listMembers(circle.id),
  ]);
  const [familyQr, doctorQr] = await Promise.all([qrSvg(familyUrl), qrSvg(doctorUrl)]);

  return (
    <main className="flex flex-col">
      <PageHeader title="Invite people" backHref="/circle" />
      <div className="flex flex-col gap-5 px-5 pt-2 pb-5">
        <InvitePanel
          patientName={circle.patient_name}
          options={{
            family: { url: familyUrl, qr: familyQr },
            doctor: { url: doctorUrl, qr: doctorQr },
          }}
        />
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-bold">In the circle</h2>
          <ul className="m-0 flex list-none flex-col rounded-[14px] border border-line bg-surface p-0">
            {members.map((m, i) => (
              <li key={m.user_id} className={`flex items-center gap-3 px-3.5 py-3 ${i < members.length - 1 ? "border-b border-[#E6EEF4]" : ""}`}>
                <Avatar name={m.name ?? m.email} seed={m.user_id} />
                <span className="flex-1 text-base">
                  {m.name ?? m.email}
                  {m.user_id === user.id && " (you)"}
                </span>
                <span className="text-sm text-ink-3">{ROLE_LABEL[m.role]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
