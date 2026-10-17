import { redirect } from "next/navigation";
import { BookIcon } from "@/components/icons";
import { getUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/tokens";
import { findInvitePreview } from "@/lib/db/queries/invites";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  link: "That sign-in link has already been used or has expired. We can send you a fresh one.",
  server: "Something went wrong signing you in. Please try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getUser()) redirect(next ?? "/home");

  // Arriving from an invite QR: say whose circle they're joining.
  const joinToken = next?.match(/^\/join\/([\w-]+)$/)?.[1];
  const invite = joinToken ? await findInvitePreview(joinToken) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-10 px-6 pt-[72px] pb-10">
      <div className="flex flex-col gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
          <BookIcon size={32} />
        </div>
        <h1 className="m-0 text-[30px] leading-tight font-bold">1stQuest</h1>
        <p className="m-0 text-lg text-ink-2">
          {invite
            ? `You’ve been invited to ${invite.patient_name}’s circle. Enter your email and we’ll get you in.`
            : "A shared place for one person’s wishes, and the people who help make them happen."}
        </p>
      </div>
      <SignInForm next={next} initialError={sp.error ? (ERRORS[sp.error] ?? null) : null} autoFocus={Boolean(invite)} />
      {!invite && (
        <p className="m-0 mt-auto text-[15px] text-ink-3">
          <b className="text-ink-2">Joining someone’s circle?</b> Open the invite link or scan the QR code you were sent.
        </p>
      )}
    </main>
  );
}
