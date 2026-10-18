import Link from "next/link";
import { ROLE_LABEL } from "@/lib/db/types";
import { BookIcon, PlusIcon } from "@/components/icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { realtimeConfig } from "@/lib/realtime";
import { CircleBook } from "@/components/CircleBook";
import { Greeting } from "@/components/Greeting";
import { InLovingMemory } from "@/components/InLovingMemory";
import { MobilityCard } from "@/components/MobilityCard";
import { ButtonLink } from "@/components/ui/Button";
import { canEditCircle, manages } from "@/lib/authz";
import { describeActivity, timeAgo } from "@/lib/activityText";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listActivity } from "@/lib/db/queries/activity";
import { listMyCircles } from "@/lib/db/queries/circles";
import { listVisibleWishes } from "@/lib/db/queries/wishes";
import { listMembers } from "@/lib/db/queries/memberships";
import { tributeSummary } from "@/lib/db/queries/tributes";
import { NotificationBell } from "@/components/NotificationBell";
import { countUnread } from "@/lib/db/queries/notifications";
import { WishRow } from "@/components/WishRow";

export const dynamic = "force-dynamic";

function BadgeIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="1" y="1" width="9" height="12" rx="1.5" />
      <rect x="3.5" y="5" width="4" height="3" rx="0.5" />
    </svg>
  );
}

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
          A circle is built around one person. If you look after someone, create their circle and add the family. If a caretaker added you, open the link or QR code they sent.
        </p>
        <ButtonLink href="/circles/new">
          <PlusIcon size={22} /> Create a circle
        </ButtonLink>
      </main>
    );
  }

  // The path changes with each new photo, so the version stops browsers showing a cached old one.
  const photoSrc = circle.patient_photo_path ? `/api/v1/circles/${circle.id}/photo?v=${encodeURIComponent(circle.patient_photo_path)}` : null;
  if (circle.mode === "memorial") {
    // The person has passed away: Home is the "In loving memory" page.
    return (
      <>
        <LiveRefresh circleId={circle.id} realtime={realtimeConfig()} />
        <div className="absolute top-4 right-5 z-10">
          <NotificationBell unread={await countUnread(user.id)} />
        </div>
        <InLovingMemory
          circleId={circle.id}
          name={circle.patient_name}
          photoSrc={photoSrc}
          birthYear={circle.birth_year}
          deathYear={circle.death_year}
          epitaph={circle.epitaph}
          tributes={await tributeSummary(circle.id, user.id)}
          canEdit={canEditCircle({ userId: user.id, role: circle.role })}
        />
      </>
    );
  }

  const [unread, circles, wishes, feed, members] = await Promise.all([
    countUnread(user.id),
    listMyCircles(user.id),
    listVisibleWishes(circle.id, user.id, 5),
    listActivity(circle.id, user.id, { limit: 3 }),
    listMembers(circle.id),
  ]);
  const owner = members.find((m) => m.role === "owner");
  const myName = user.name ?? user.email;
  const roleChip = circle.trusted_user_id === user.id ? "Trusted person" : ROLE_LABEL[circle.role];

  return (
    <main className="flex flex-col gap-5 px-5 pt-4 pb-5">
      <LiveRefresh circleId={circle.id} realtime={realtimeConfig()} />
      <header className="flex items-center gap-3.5 rounded-[18px] border-[1.5px] border-[#FFE0AE] bg-[#FFF7EA] px-3 py-4" data-testid="home-header">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cta text-[28px] font-bold text-cta-ink" aria-hidden>
          {myName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <Greeting className="text-[15px] text-ink-3" />
          <span className="truncate text-2xl leading-tight font-bold">{myName} (you)</span>
          <span className="mt-1 flex items-center gap-1.5 rounded-lg border border-accent bg-primary-soft px-2.5 py-0.5 text-sm font-bold text-primary-hover" data-testid="role-chip">
            <BadgeIcon /> {roleChip}
          </span>
        </div>
        <div className="self-start">
          <NotificationBell unread={unread} />
        </div>
      </header>

      <CircleBook
        current={{ id: circle.id, patient_name: circle.patient_name }}
        circles={circles.map((c) => ({ id: c.id, patient_name: c.patient_name }))}
        ownerName={owner ? (owner.name ?? owner.email) : null}
        photoSrc={photoSrc}
      />

      <MobilityCard
        circleId={circle.id}
        mobility={circle.mobility}
        notes={circle.mobility_notes}
        canEdit={canEditCircle({ userId: user.id, role: circle.role })}
      />

      {manages(circle.role) && (
        <ButtonLink href="/wishes/new" className="h-14">
          <PlusIcon size={22} /> Add a wish
        </ButtonLink>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 text-lg font-bold">Wishes we’re working on</h2>
        {wishes.length === 0 ? (
          <p className="m-0 rounded-[14px] border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">
            {manages(circle.role)
              ? "No wishes yet. There’s no rush. Add one whenever something comes to mind."
              : `No wishes shared yet. When a caretaker adds one, it shows up here.`}
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
