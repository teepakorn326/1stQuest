import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { canSwitchMode, memorialUndoUntil, manages } from "@/lib/authz";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { MemorialSwitch } from "./MemorialSwitch";

export const dynamic = "force-dynamic";

export default async function MemorialPage() {
  const user = await requirePageUser("/circle/memorial");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  if (!manages(circle.role)) redirect("/circle");
  const until = memorialUndoUntil(circle);
  const canSwitch = canSwitchMode({ userId: user.id, role: circle.role }, circle);
  const name = circle.patient_name;

  return (
    <main className="flex flex-col">
      <PageHeader title="Memorial album" backHref="/circle" />
      <div className="flex flex-col gap-4 px-5 pt-2 pb-5">
        {circle.mode === "active" ? (
          <>
            <h2 className="m-0 text-xl leading-snug font-bold">Turn {name}’s book into a memorial album?</h2>
            <p className="m-0 text-base text-ink-2">Take your time. Nothing is deleted, and you can undo this for 30 days.</p>
            <ul className="m-0 flex list-disc flex-col gap-2 rounded-2xl border border-line bg-surface p-4 pl-8 text-[15px] text-ink-2">
              <li>Home becomes “Remembering {name}”, with the newest cards.</li>
              <li>Everyone can share a memory: photos, a voice note or a few words become a card in the book.</li>
              <li>Adding wishes and “Talk it through” are put away. Existing wishes, cards and messages stay.</li>
              <li>The menu becomes Home, Book and Family.</li>
            </ul>
            <MemorialSwitch circleId={circle.id} to="memorial" label="Turn into a memorial album" />
          </>
        ) : canSwitch && until ? (
          <>
            <h2 className="m-0 text-xl leading-snug font-bold">{name}’s book is a memorial album</h2>
            <p className="m-0 text-base text-ink-2">
              If this was a mistake, you can turn it back until{" "}
              {until.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}. Everything shared stays in the book.
            </p>
            <MemorialSwitch circleId={circle.id} to="active" label="Undo the memorial album" secondary />
          </>
        ) : (
          <p className="m-0 text-base text-ink-2">{name}’s book is a memorial album.</p>
        )}
      </div>
    </main>
  );
}
