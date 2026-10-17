import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/tokens";
import { WelcomeForm } from "./WelcomeForm";

export const dynamic = "force-dynamic";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next) ?? "/home";
  const user = await requirePageUser("/welcome");
  if (user.name) redirect(next);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-6 px-6 pt-[72px] pb-10">
      <h1 className="m-0 text-[30px] leading-tight font-bold">Welcome</h1>
      <p className="m-0 text-lg text-ink-2">What should the family call you?</p>
      <WelcomeForm next={next} />
    </main>
  );
}
