import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { CategoryIcon, ExportIcon, PlusIcon } from "@/components/icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { CATEGORY_LABEL } from "@/lib/activityText";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listBookCards, type BookCard } from "@/lib/db/queries/cards";
import { CATEGORIES, type Category } from "@/lib/db/types";
import { realtimeConfig } from "@/lib/realtime";
import { groupByMonthSeason } from "@/lib/season";

export const dynamic = "force-dynamic";

const PROMPT: Record<Category, (name: string) => string> = {
  places: (n) => `A place ${n} would love to be?`,
  tastes: (n) => `A taste ${n} misses?`,
  people: (n) => `Someone ${n} would love to see?`,
  music: (n) => `A song that takes ${n} somewhere?`,
  nature: () => "Somewhere green, or by the water?",
  legacy: () => "A recipe or story to pass on?",
};

const MEMORY_PROMPT: Record<Category, (name: string) => string> = {
  places: (n) => `A place that was ${n}’s?`,
  tastes: (n) => `Something ${n} loved to cook or eat?`,
  people: (n) => `Someone ${n} lit up around?`,
  music: (n) => `A song that sounds like ${n}?`,
  nature: (n) => `Where ${n} loved to be outside?`,
  legacy: (n) => `Something ${n} taught you?`,
};

const TILTS = ["-rotate-6", "rotate-3", "-rotate-2"];
const TONES = ["bg-[#FFE3B8]", "bg-[#FFD497]", "bg-[#FFDFAE]"];

function Cover({ card, className }: { card: BookCard; className?: string }) {
  return (
    <div className={clsx("overflow-hidden", card.level > 0 ? "gold-frame-cover border-[3px]" : "border-2 border-white", className)}>
      {card.cover_media_id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/v1/media/${card.cover_media_id}`} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary">
          <CategoryIcon category={card.category} />
        </div>
      )}
    </div>
  );
}

function Collection({ cards, name, memorial, canPost }: { cards: BookCard[]; name: string; memorial: boolean; canPost: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3" data-testid="collection">
      {CATEGORIES.map((cat) => {
        const inCat = cards.filter((c) => c.category === cat);
        if (inCat.length === 0) {
          return (
            <div key={cat} className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-dashed border-[#E8CFA6] p-3.5" data-slot={cat}>
              <span className="flex items-center gap-1.5 text-[15px] font-bold text-ink-2">
                <CategoryIcon category={cat} size={18} />
                {CATEGORY_LABEL[cat]}
              </span>
              <p className="m-0 flex-1 text-[15px] leading-snug text-ink-2">{memorial ? MEMORY_PROMPT[cat](name) : PROMPT[cat](name)}</p>
              {canPost && (
                <Link
                  href={memorial ? `/memories/new?category=${cat}` : `/wishes/new?category=${cat}`}
                  className="flex min-h-11 items-center text-[15px] font-bold no-underline"
                >
                  {memorial ? "Share a memory" : "Add a wish"}
                </Link>
              )}
            </div>
          );
        }
        const href = inCat.length === 1 ? `/cards/${inCat[0]!.id}` : `/book?view=timeline&category=${cat}`;
        const fan = inCat.slice(0, 3).reverse();
        return (
          <Link
            key={cat}
            href={href}
            className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3.5 text-ink no-underline hover:text-ink"
            data-slot={cat}
          >
            <span className="flex items-center gap-1.5 text-[15px] font-bold text-primary-hover">
              <CategoryIcon category={cat} size={18} />
              {CATEGORY_LABEL[cat]}
            </span>
            <div className="relative h-[104px]">
              {fan.map((c, i) => (
                <Cover
                  key={c.id}
                  card={c}
                  className={clsx(
                    "absolute top-1 h-24 w-20 rounded-[10px]",
                    TONES[i % 3],
                    TILTS[i % 3],
                    fan.length === 1 ? "left-6" : i === 0 ? "left-1.5" : i === 1 ? "left-11" : "left-8",
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-ink-3">{inCat.length === 1 ? "1 card" : `${inCat.length} cards`}</span>
          </Link>
        );
      })}
    </div>
  );
}

function Timeline({ cards, hemisphere }: { cards: BookCard[]; hemisphere: "north" | "south" }) {
  const groups = groupByMonthSeason(cards, hemisphere);
  return (
    <div className="flex flex-col gap-4" data-testid="timeline">
      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-2.5">
          <h2 className="m-0 text-[17px] font-bold">{g.label}</h2>
          {g.items.map((c) => (
            <Link
              key={c.id}
              href={`/cards/${c.id}`}
              className={clsx(
                "flex gap-3.5 rounded-2xl bg-surface p-3 text-ink no-underline hover:text-ink",
                c.level > 0 ? "gold-glow gold-frame relative overflow-hidden border-[3px]" : "border border-line",
              )}
            >
              <Cover card={c} className="h-[92px] w-[76px] shrink-0 rounded-[10px] !border-0 bg-[#FFD497]" />
              <div className="flex flex-col justify-center gap-1">
                <span className="text-[13px] font-bold text-primary-hover">{CATEGORY_LABEL[c.category]}</span>
                <span className="text-[17px] leading-tight font-bold">{c.title}</span>
                <span className="text-sm text-ink-3">
                  {c.happened_on.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                  {c.place && ` · ${c.place}`}
                </span>
              </div>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}

export default async function BookPage({ searchParams }: { searchParams: Promise<{ view?: string; category?: string }> }) {
  const user = await requirePageUser("/book");
  const circle = await getActiveCircle(user.id);
  if (!circle) redirect("/home");
  const sp = await searchParams;
  const view = sp.view === "timeline" ? "timeline" : "collection";
  const category = CATEGORIES.includes(sp.category as Category) ? (sp.category as Category) : null;
  const all = await listBookCards(circle.id, user.id);
  const cards = category ? all.filter((c) => c.category === category) : all;

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-5">
      <LiveRefresh circleId={circle.id} realtime={realtimeConfig()} />
      <header className="flex items-center justify-between">
        <h1 className="m-0 text-2xl font-bold">{circle.patient_name}’s book</h1>
        <Link
          href="/book/export"
          aria-label="Make a copy of the book"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-primary"
        >
          <ExportIcon size={22} />
        </Link>
      </header>
      <div role="tablist" aria-label="Book view" className="grid grid-cols-2 gap-1 rounded-[14px] bg-tint p-1">
        {(["collection", "timeline"] as const).map((v) => (
          <Link
            key={v}
            role="tab"
            aria-selected={view === v}
            href={v === "collection" ? "/book" : "/book?view=timeline"}
            className={clsx(
              "flex h-11 items-center justify-center rounded-[11px] text-[15px] no-underline",
              view === v ? "bg-surface font-bold text-ink hover:text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {v === "collection" ? "Collection" : "Timeline"}
          </Link>
        ))}
      </div>
      {category && view === "timeline" && (
        <p className="m-0 text-sm text-ink-3">
          Showing {CATEGORY_LABEL[category]} ·{" "}
          <Link href="/book?view=timeline" className="font-bold no-underline">
            Show all
          </Link>
        </p>
      )}
      {view === "collection" ? <Collection cards={all} name={circle.patient_name} memorial={circle.mode === "memorial"} canPost={circle.role === "owner"} /> : <Timeline cards={cards} hemisphere={circle.hemisphere} />}
      {circle.role === "owner" && (
      <Link
        href={circle.mode === "memorial" ? "/memories/new" : "/wishes/new"}
        className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#E8CFA6] text-[15px] font-bold no-underline"
      >
        <PlusIcon size={18} /> {circle.mode === "memorial" ? "Share a memory" : "Add a wish for the next page"}
      </Link>
      )}
    </main>
  );
}
