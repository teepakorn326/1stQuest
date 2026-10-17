import { redirect } from "next/navigation";
import { BookIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { getUser } from "@/lib/auth/session";
import { findInvitePreview } from "@/lib/db/queries/invites";
import { findMembership } from "@/lib/db/queries/memberships";
import { JoinButton } from "./JoinButton";

export const dynamic = "force-dynamic";

const ROLE_COPY = {
  family: "You’ll be able to see shared wishes, take quests and add to cards.",
  doctor: "You’re joining as part of the care team. You’ll see the wishes the family shares and can leave notes.",
};

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const here = `/join/${token}`;
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(here)}`);
  if (!user.name) redirect(`/welcome?next=${encodeURIComponent(here)}`);

  const invite = await findInvitePreview(token);
  const member = invite ? await findMembership(invite.circle_id, user.id) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-6 px-6 pt-[72px] pb-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
        <BookIcon size={32} />
      </div>
      {!invite ? (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">We couldn’t find that invite</h1>
          <p className="m-0 text-lg text-ink-2">Ask whoever sent it for a new link or QR code.</p>
          <ButtonLink href="/home">Go to my circles</ButtonLink>
        </>
      ) : member ? (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">You’re already in {invite.patient_name}’s circle</h1>
          <JoinButton token={token} label={`Open ${invite.patient_name}’s circle`} />
        </>
      ) : invite.expired ? (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">This invite has expired</h1>
          <p className="m-0 text-lg text-ink-2">Ask for a new link to {invite.patient_name}’s circle.</p>
        </>
      ) : (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">Join {invite.patient_name}’s circle</h1>
          <p className="m-0 text-lg text-ink-2">{ROLE_COPY[invite.role]}</p>
          <p className="m-0 text-[15px] text-ink-3">Signed in as {user.email}</p>
          <JoinButton token={token} label="Join the circle" />
        </>
      )}
    </main>
  );
}
