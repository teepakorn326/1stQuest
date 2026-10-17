import { redirect } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { canInvite } from "@/lib/authz";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { owner: "Owner", family: "Family", doctor: "Care team" } as const;

export default async function CirclePage() {
  const user = await requirePageUser("/circle");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  const members = await listMembers(circle.id);

  return (
    <main className="flex flex-col">
      <PageHeader title={`${circle.patient_name}’s circle`} />
      <div className="flex flex-col gap-5 px-5 pt-2 pb-5">
        {canInvite({ userId: user.id, role: circle.role }) && (
          <ButtonLink href="/circle/invite">
            <PlusIcon size={22} /> Invite people
          </ButtonLink>
        )}
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-bold">In the circle</h2>
          <ul className="m-0 flex list-none flex-col rounded-[14px] border border-line bg-surface p-0" data-testid="members">
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

        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-bold">Your account</h2>
          <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4">
            <p className="m-0 text-[15px] text-ink-2">
              Signed in as <b className="text-ink">{user.email}</b>
            </p>
            <PasswordForm hasPassword={Boolean(user.password_hash)} />
            <form action="/api/v1/auth/sign-out" method="post" className="m-0">
              <button type="submit" className="min-h-11 text-[15px] font-bold text-primary">
                Sign out
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
