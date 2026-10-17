import Link from "next/link";
import { BookIcon, PlusIcon } from "@/components/icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { realtimeConfig } from "@/lib/realtime";
import { CircleSwitcher } from "@/components/CircleSwitcher";
import { Greeting } from "@/components/Greeting";
import { MobilityCard } from "@/components/MobilityCard";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { canEditCircle } from "@/lib/authz";
import { describeActivity, timeAgo } from "@/lib/activityText";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listActivity } from "@/lib/db/queries/activity";
import { listMyCircles } from "@/lib/db/queries/circles";
import { listVisibleWishes } from "@/lib/db/queries/wishes";
import { WishRow } from "@/components/WishRow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requirePageUser("/home");
  const circle = await getActiveCircle(user.id);

  if (!circle) {
    return (
      <main className="flex flex-col gap-6 px-6 pt-[72px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
          <BookIcon size={32} />
        </div>
        <h1 className="m-0 text-[30px] leading-tight font-bold">Hello, {user.name}</h1>
        <p className="m-0 text-lg text-ink-2">
          A circle is built around one person. Start one, or open the invite link someone sent you to join theirs.
        </p>
        <ButtonLink href="/circles/new">
          <PlusIcon size={22} /> Create a circle
        </ButtonLink>
      </main>
    );
  }

  const [circles, wishes, feed] = await Promise.all([
    listMyCircles(user.id),
    listVisibleWishes(circle.id, user.id, 5),
    listActivity(circle.id, user.id, { limit: 3 }),
  ]);
  const photoSrc = circle.patient_photo_path ? `/api/v1/circles/${circle.id}/photo` : null;

  return (
    <main className="flex flex-col gap-5 px-5 pt-6 pb-5">
      <LiveRefresh circleId={circle.id} realtime={realtimeConfig()} />
      <header className="flex items-center gap-3.5">
        <Avatar name={circle.patient_name} seed="patient" size={56} src={photoSrc} tone="bg-[#C7DCEE] text-primary" />
        <div className="flex flex-1 flex-col gap-0.5">
          <Greeting name={user.name ?? ""} />
          <CircleSwitcher current={circle} circles={circles.map((c) => ({ id: c.id, patient_name: c.patient_name }))} />
        </div>
      </header>

      <MobilityCard
        circleId={circle.id}
        mobility={circle.mobility}
        notes={circle.mobility_notes}
        canEdit={canEditCircle({ userId: user.id, role: circle.role })}
      />

      <ButtonLink href="/wishes/new" className="h-14">
        <PlusIcon size={22} /> Add a wish
      </ButtonLink>

      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 text-lg font-bold">Wishes we’re working on</h2>
        {wishes.length === 0 ? (
          <p className="m-0 rounded-[14px] border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">
            No wishes yet. There’s no rush. Add one whenever something comes to mind.
          </p>
        ) : (
          wishes.map((w) => <WishRow key={w.id} wish={w} />)
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-lg font-bold">Latest in the circle</h2>
          <Link href="/activity" className="text-[15px] font-bold no-underline">
            See all
          </Link>
        </div>
        <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface px-4 py-3.5 text-[15px] leading-snug">
          {feed.map((a) => (
            <p key={a.id} className="m-0">
              <b>{a.actor_id === user.id ? "You" : (a.actor_name ?? "Someone")}</b> {describeActivity(a)}{" "}
              <span className="text-ink-3">· {timeAgo(a.created_at)}</span>
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
