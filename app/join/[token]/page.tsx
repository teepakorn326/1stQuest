import { redirect } from "next/navigation";
import { BookIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { getUser } from "@/lib/auth/session";
import { findMembership } from "@/lib/db/queries/memberships";
import { caretakerNames, findJoinTarget } from "@/lib/db/queries/people";
import { OpenCircleButton } from "./OpenCircleButton";

export const dynamic = "force-dynamic";

/**
 * The circle's link / QR code. Signed out: sign in first. Signed in and on the list: open the circle.
 * Not on the list: say who can add you. Nobody joins just by having the link.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const here = `/join/${token}`;
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(here)}`);
  if (!user.name) redirect(`/welcome?next=${encodeURIComponent(here)}`);

  const target = await findJoinTarget(token);
  const member = target ? await findMembership(target.circle_id, user.id) : null;
  const askWho = target && !member ? await caretakerNames(target.circle_id) : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-6 px-6 pt-[72px] pb-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
        <BookIcon size={32} />
      </div>
      {!target ? (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">We couldn’t find that circle</h1>
          <p className="m-0 text-lg text-ink-2">Ask whoever sent it for the link again.</p>
          <ButtonLink href="/home">Go to my circles</ButtonLink>
        </>
      ) : member ? (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">Welcome to {target.patient_name}’s circle</h1>
          <OpenCircleButton circleId={target.circle_id} label={`Open ${target.patient_name}’s circle`} />
        </>
      ) : (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">You’re not on {target.patient_name}’s list yet</h1>
          <p className="m-0 text-lg text-ink-2">
            Ask {askWho.length ? askWho.join(" or ") : "a caretaker"} to add you with this email
            {user.phone ? " or mobile number" : ""}:
          </p>
          <p className="m-0 rounded-[14px] border border-line bg-surface px-4 py-3 text-base font-bold" data-testid="not-on-list">
            {user.email}
            {user.phone && <span className="block font-normal text-ink-2">{user.phone}</span>}
          </p>
          <p className="m-0 text-[15px] text-ink-3">Then open this link again. If you signed in with a different email, sign out and use the one they have.</p>
          <form action="/api/v1/auth/sign-out" method="post" className="m-0">
            <button type="submit" className="min-h-11 text-base font-bold text-primary">
              Sign out
            </button>
          </form>
        </>
      )}
    </main>
  );
}
