import { redirect } from "next/navigation";
import { ROLE_LABEL } from "@/lib/db/types";
import { SignOutButton } from "@/components/SignOutButton";
import { PlusIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { canInvite, manages, memorialUndoUntil } from "@/lib/authz";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listMembers } from "@/lib/db/queries/memberships";
import { findOpenRequest } from "@/lib/db/queries/memorial";
import { canAsk, canCancel, canConfirm, canTrustedSwitch } from "@/lib/memorial";
import { MemorialHandover, TrustedForm, type HandoverView } from "./MemorialHandover";
import { PasswordForm } from "./PasswordForm";
import { PhoneForm } from "./PhoneForm";

export const dynamic = "force-dynamic";

export default async function CirclePage() {
  const user = await requirePageUser("/circle");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  const [members, open] = await Promise.all([listMembers(circle.id), circle.mode === "active" ? findOpenRequest(circle.id) : null]);
  const viewer = { userId: user.id, role: circle.role };
  const label = (m: { name: string | null; email: string }) => m.name ?? m.email;
  const caretakers = members.filter((m) => m.role === "caretaker").map(label);
  const handover: HandoverView = {
    circleId: circle.id,
    patientName: circle.patient_name,
    managerNames: caretakers.length ? caretakers.join(" and ") : "the caretakers",
    manages: manages(circle.role),
    can: {
      switch: canTrustedSwitch(viewer, circle),
      ask: canAsk(viewer, circle, open),
      confirm: canConfirm(viewer, circle, open),
      cancel: canCancel(viewer, open),
    },
    open: open && {
      requesterName: open.requester_name ?? "A family member",
      confirmerName: open.confirmer_name,
      takesEffectAt: open.takes_effect_at?.toISOString() ?? null,
      mine: open.requested_by === user.id,
    },
  };
  const showHandover = circle.mode === "active" && (open || Object.values(handover.can).some(Boolean));

  return (
    <main className="flex flex-col">
      <PageHeader title={circle.mode === "memorial" ? "Family" : `${circle.patient_name}’s circle`} />
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
              <li key={m.user_id} className={`flex items-center gap-3 px-3.5 py-3 ${i < members.length - 1 ? "border-b border-[#F6EBDA]" : ""}`}>
                <Avatar name={m.name ?? m.email} seed={m.user_id} />
                <span className="flex-1 text-base">
                  {m.name ?? m.email}
                  {m.user_id === user.id && " (you)"}
                </span>
                <span className="text-sm text-ink-3">
                  {ROLE_LABEL[m.role]}
                  {m.user_id === circle.trusted_user_id && " · Trusted"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {manages(circle.role) && (
          <Link href="/circle/memorial" className="text-[15px] font-bold no-underline" data-testid="memorial-link">
            {circle.mode === "active"
              ? `Turn ${circle.patient_name}’s book into a memorial album`
              : memorialUndoUntil(circle)! > new Date()
                ? "Memorial album: the stone, or undo"
                : `${circle.patient_name}’s stone`}
          </Link>
        )}
        {manages(circle.role) && circle.mode === "active" && (
          <TrustedForm
            circleId={circle.id}
            patientName={circle.patient_name}
            people={members.filter((m) => m.role === "viewer" || m.role === "health").map((m) => ({ id: m.user_id, name: label(m) }))}
            trustedUserId={circle.trusted_user_id}
            nudge={false}
          />
        )}
        {showHandover && <MemorialHandover v={handover} />}
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-bold">Your account</h2>
          <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4">
            <p className="m-0 text-[15px] text-ink-2">
              Signed in as <b className="text-ink">{user.email}</b>
            </p>
            <PhoneForm phone={user.phone} optIn={user.sms_opt_in} />
            <PasswordForm hasPassword={Boolean(user.password_hash)} />
            <SignOutButton className="min-h-11 text-[15px] font-bold text-primary" />
          </div>
        </section>
      </div>
    </main>
  );
}
