import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/icons";
import { CATEGORY_LABEL } from "@/lib/activityText";
import { findSharedCard } from "@/lib/db/queries/cards";
import { VoicePlayer } from "@/components/VoicePlayer";

export const dynamic = "force-dynamic";

async function load(token: string) {
  return /^[\w-]{10,64}$/.test(token) ? findSharedCard(token) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const card = await load((await params).token);
  return {
    title: card ? `${card.title} · 1stQuest` : "1stQuest",
    description: card ? card.body.slice(0, 160) : undefined,
    robots: { index: false, follow: false },
  };
}

/** Public view of one shared card. No sign-in, and nothing from the circle beyond this card. */
export default async function SharedCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await load(token);
  if (!card) notFound();
  const media = (id: string) => `/api/v1/share/${token}/media/${id}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col gap-4 px-5 pt-8 pb-12">
      <p className="m-0 text-center text-sm text-ink-3">A page from {card.patient_name}’s book · 1stQuest</p>
      <div className="relative isolate">
      {card.level > 0 && <span aria-hidden className="gold-aura" />}
      <article
        className={`relative z-10 flex flex-col overflow-hidden rounded-[20px] border-4 bg-surface ${card.level > 0 ? "gold-card gold-frame" : "border-[#F3E2C6]"}`}
        data-testid="shared-card"
      >
        {card.photo_ids[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media(card.photo_ids[0])} alt="" className="max-h-[420px] w-full object-cover" />
        )}
        <div className="flex flex-col gap-2.5 px-5 pt-4 pb-5">
          <span className="flex items-center gap-1.5 text-sm font-bold text-primary-hover">
            <CategoryIcon category={card.category} size={18} />
            {CATEGORY_LABEL[card.category]} · {card.happened_on.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            {card.place ? ` · ${card.place}` : ""}
          </span>
          <h1 className="m-0 text-2xl leading-tight font-bold">{card.title}</h1>
          <p className="m-0 text-base leading-relaxed text-[#4A3926]">{card.body}</p>
          {card.photo_ids.length > 1 && (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {card.photo_ids.slice(1).map((id) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={id} src={media(id)} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
          {card.recordings.map((r) =>
            r.kind === "voice" ? (
              <VoicePlayer key={r.id} src={media(r.id)} durationSec={r.duration_sec} />
            ) : (
              <video key={r.id} controls playsInline preload="metadata" src={media(r.id)} className="w-full rounded-lg bg-black" />
            ),
          )}
        </div>
      </article>
      </div>
    </main>
  );
}
