import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon, ChevronLeft } from "@/components/icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Avatar } from "@/components/ui/Avatar";
import { canSeeCard } from "@/lib/authz";
import { CATEGORY_LABEL } from "@/lib/activityText";
import { requirePageUser } from "@/lib/auth/session";
import { findCardForMember } from "@/lib/db/queries/cards";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { realtimeConfig } from "@/lib/realtime";
import { CardActions } from "./CardActions";

export const dynamic = "force-dynamic";

function PhotoGrid({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  const [a, b, c] = ids;
  const src = (id: string) => `/api/v1/media/${id}`;
  return (
    <div className="grid h-[180px] grid-cols-3 gap-[3px]" data-testid="card-photos">
      <a href={src(a!)} target="_blank" rel="noreferrer" className={ids.length === 1 ? "col-span-3" : "col-span-2"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src(a!)} alt="" className="h-full w-full object-cover" />
      </a>
      {b && (
        <div className="grid gap-[3px]">
          <a href={src(b)} target="_blank" rel="noreferrer" className={c ? "" : "row-span-2"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src(b)} alt="" className="h-full w-full object-cover" />
          </a>
          {c && (
            <a href={src(c)} target="_blank" rel="noreferrer" className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src(c)} alt="" className="h-full w-full object-cover" />
              {ids.length > 3 && (
                <span className="absolute inset-0 flex items-center justify-center bg-[#1F527D]/55 text-[15px] font-bold text-white">
                  +{ids.length - 3}
                </span>
              )}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/cards/${id}`);
  const card = /^[0-9a-f-]{36}$/i.test(id) ? await findCardForMember(id, user.id) : null;
  if (!card || !canSeeCard({ userId: user.id, role: card.viewer_role }, card, card.viewer_ids)) notFound();
  const circle = await findCircleForMember(card.circle_id, user.id);
  const patient = circle?.patient_name ?? "them";
  const n = card.photo_ids.length;
  const storyBy = card.author_id === user.id ? "your" : `${card.author_name ?? "someone"}’s`;
  const credit = n > 0 ? `Made from ${n === 1 ? "1 photo" : `${n} photos`} and ${storyBy} story` : `Made from ${storyBy} story`;

  return (
    <main className="flex flex-col">
      <LiveRefresh circleId={card.circle_id} realtime={realtimeConfig()} />
      <header className="flex items-center justify-between px-3 pt-3 pb-1">
        <Link href="/book" aria-label="Back to the book" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:text-ink">
          <ChevronLeft />
        </Link>
        <span className="flex items-center gap-1.5 rounded-2xl bg-tint px-3 py-1.5 text-sm font-bold text-primary-hover">
          <CategoryIcon category={card.category} size={18} />
          {CATEGORY_LABEL[card.category]}
        </span>
        <span className="w-11" />
      </header>

      <div className="flex flex-col gap-3 px-5 pt-1.5 pb-5">
        <article className="flex flex-col overflow-hidden rounded-[20px] border-4 border-[#BFD8EE] bg-surface">
          <PhotoGrid ids={card.photo_ids} />
          <div className="flex flex-col gap-2 px-4 pt-3.5 pb-3">
            <h1 className="m-0 text-xl leading-tight font-bold">{card.title}</h1>
            <p className="m-0 text-[15px] leading-normal text-[#33475A]">{card.body}</p>
            <p className="m-0 text-sm text-ink-3">
              {credit}
              {card.place ? ` · ${card.place}` : ""} ·{" "}
              {card.happened_on.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            </p>
            {card.wish_id && card.wish_text && (
              <Link href={`/wishes/${card.wish_id}`} className="text-sm font-bold no-underline">
                From the wish: {card.wish_text}
              </Link>
            )}
          </div>
          <CardActions
            cardId={card.id}
            circleId={card.circle_id}
            liked={card.liked_by_me}
            likes={card.like_count}
            likerNames={card.liker_names}
            messageCount={card.messages.length}
            storage={realtimeConfig()}
          />
        </article>

        <section className="flex flex-col gap-2" data-testid="messages">
          <h2 className="m-0 text-base font-bold">Messages for {patient}</h2>
          {card.messages.length === 0 && <p className="m-0 text-[15px] text-ink-3">No messages yet. Be the first to leave one.</p>}
          {card.messages.map((m) => (
            <div key={m.id} className="flex items-start gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2.5">
              <Avatar name={m.author_name} seed={m.author_id} />
              <p className="m-0 flex-1 pt-0.5 text-[15px] leading-snug">
                <b>{m.author_id === user.id ? "You" : (m.author_name ?? "Someone")}</b>
                <br />
                {m.text}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
