import Link from "next/link";
import { redirect } from "next/navigation";
import { BookIcon } from "@/components/icons";
import { SignOutButton } from "@/components/SignOutButton";
import { ButtonLink } from "@/components/ui/Button";
import { getUser } from "@/lib/auth/session";
import { findMembership } from "@/lib/db/queries/memberships";
import { findJoinTarget } from "@/lib/db/queries/people";
import { OpenCircleButton } from "./OpenCircleButton";
import { JoinAsForm, RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

/**
 * The circle's link / QR code. New here: register (name, email, mobile, family or health
 * professional) and confirm with a code. Signed in: join, or open it if you're already in.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const here = `/join/${token}`;
  const [user, target] = await Promise.all([getUser(), findJoinTarget(token)]);
  if (user && !user.name) redirect(`/welcome?next=${encodeURIComponent(here)}`);
  const member = user && target ? await findMembership(target.circle_id, user.id) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-6 px-6 pt-14 pb-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
        <BookIcon size={32} />
      </div>
      {!target ? (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">We couldn’t find that circle</h1>
          <p className="m-0 text-lg text-ink-2">Ask whoever sent it for the link again.</p>
          <ButtonLink href="/home">Go to my circles</ButtonLink>
        </>
      ) : !user ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] leading-tight font-bold">Join {target.patient_name}’s circle</h1>
            <p className="m-0 text-lg text-ink-2">Tell us who you are. We’ll email you a code to confirm.</p>
          </div>
          <RegisterForm token={token} patientName={target.patient_name} />
          <p className="m-0 text-[15px] text-ink-3">
            Already have an account?{" "}
            <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className="font-bold no-underline">
              Sign in
            </Link>
          </p>
        </>
      ) : member ? (
        <>
          <h1 className="m-0 text-[28px] leading-tight font-bold">Welcome to {target.patient_name}’s circle</h1>
          <OpenCircleButton circleId={target.circle_id} label={`Open ${target.patient_name}’s circle`} />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] leading-tight font-bold">Join {target.patient_name}’s circle</h1>
            <p className="m-0 text-[15px] text-ink-3">Signed in as {user.email}</p>
          </div>
          <JoinAsForm token={token} patientName={target.patient_name} />
          <SignOutButton />
        </>
      )}
    </main>
  );
}
