import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { CategoryIcon, ExportIcon, PlusIcon } from "@/components/icons";
import { ChipRow } from "@/components/ChipRow";
import { LiveRefresh } from "@/components/LiveRefresh";
import { CATEGORY_LABEL } from "@/lib/activityText";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { listBookCards, type BookCard } from "@/lib/db/queries/cards";
import { listVisibleWishes, type WishSummary } from "@/lib/db/queries/wishes";
import { CATEGORIES, type Category } from "@/lib/db/types";
import { realtimeConfig } from "@/lib/realtime";
import { groupByMonthSeason } from "@/lib/season";

export const dynamic = "force-dynamic";

// Short prompts for empty categories, sized for a small tile (from the "Book - collection" design).
const PROMPT: Record<Category, string> = {
  places: "Somewhere to go?",
  tastes: "A taste to share?",
  people: "Someone to see?",
  music: "A song to hear?",
  nature: "Somewhere green?",
  legacy: "A story to pass on?",
};

const MEMORY_PROMPT: Record<Category, string> = {
  places: "A place to remember?",
  tastes: "A favourite taste?",
  people: "Someone dear?",
  music: "A song to remember?",
  nature: "Time outside?",
  legacy: "A lesson to keep?",
};

const TONES = ["bg-[#FFD497]", "bg-[#FFDFB0]", "bg-[#FFF0DA]", "bg-[#FFE8C6]"];

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

const tile = "relative flex aspect-[106/159] flex-col rounded-[14px] no-underline";

/** A card in the collection: gold frame for gold cards, a soft grey frame for the rest. */
function CardTile({ card, i }: { card: BookCard; i: number }) {
  const gold = card.level > 0;
  return (
    <Link
      href={`/cards/${card.id}`}
      className={clsx(tile, "overflow-hidden border-[6px] p-1.5 text-ink hover:text-ink", gold ? "gold-frame shadow-[0_0_0_4px_rgba(245,183,49,.35),0_4px_16px_rgba(245,183,49,.55)]" : "border-[#B4B2A9] bg-surface")}
      data-testid="book-card"
      data-level={gold ? 1 : 0}
    >
      <div className={clsx("aspect-[82/70] w-full shrink-0 overflow-hidden rounded-lg", TONES[i % TONES.length])}>
        {card.cover_media_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/v1/media/${card.cover_media_id}`} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary">
            <CategoryIcon category={card.category} size={22} />
          </div>
        )}
      </div>
      <span className="mt-1.5 line-clamp-2 text-[12px] leading-[1.25] font-bold">{card.title}</span>
      <span className="mt-auto flex items-center gap-1 text-[11px] text-ink-3">
        <CategoryIcon category={card.category} size={11} className="text-primary-hover" />
        {CATEGORY_LABEL[card.category]}
      </span>
      {gold && (
        <>
          <span aria-hidden className="gold-gloss" />
          <span aria-hidden className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border-[0.75px] border-[#B8790C] bg-gold-soft text-[#B8790C]">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" /></svg>
          </span>
        </>
      )}
    </Link>
  );
}

/** A wish that has no card yet: dashed amber tile with who's on it. */
function WishTile({ wish }: { wish: WishSummary }) {
  const claimer = wish.active_quest?.claimer_name?.split(" ")[0];
  const chip = wish.done ? "Done" : claimer ? `${claimer} is on it` : "Wish";
  return (
    <Link
      href={`/wishes/${wish.id}`}
      className={clsx(tile, "items-center justify-center gap-2 border-[1.5px] border-dashed border-accent bg-surface px-2 text-center text-primary-hover hover:text-primary-hover")}
      data-testid="book-wish"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
        <CategoryIcon category={wish.category} size={18} />
      </span>
      <span className="line-clamp-3 text-[12px] leading-[1.25] font-bold">{wish.text}</span>
      <span className="max-w-full truncate rounded-full bg-tint px-2 py-0.5 text-[11px]">{chip}</span>
    </Link>
  );
}

/** An empty category: a gentle question that opens a new wish (or memory) in that category. */
function PromptTile({ text, href, icon }: { text: string; href: string | null; icon: React.ReactNode }) {
  const body = (
    <>
      <span className="text-accent">{icon}</span>
      <span className="text-[12px] leading-[1.25] text-[#A8957C]">{text}</span>
    </>
  );
  const cls = clsx(tile, "items-center justify-center gap-2.5 border-[1.5px] border-dashed border-field px-2 text-center");
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Collection({
  cards,
  wishes,
  category,
  memorial,
  canPost,
}: {
  cards: BookCard[];
  wishes: WishSummary[];
  category: Category | null;
  memorial: boolean;
  canPost: boolean;
}) {
  const inView = (c: Category) => !category || c === category;
  const shownCards = cards.filter((c) => inView(c.category));
  const carded = new Set(cards.map((c) => c.wish_id).filter(Boolean));
  const shownWishes = memorial ? [] : wishes.filter((w) => inView(w.category) && !carded.has(w.id));
  const filled = new Set<Category>([...cards.map((c) => c.category), ...shownWishes.map((w) => w.category)]);
  const empty = CATEGORIES.filter((c) => inView(c) && !filled.has(c));
  const newHref = (c?: Category) => (memorial ? "/memories/new" : "/wishes/new") + (c ? `?category=${c}` : "");

  return (
    <>
      <ChipRow label="Filter by kind" className="relative -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
        {[null, ...CATEGORIES].map((c) => (
          <Link
            key={c ?? "all"}
            href={c ? `/book?category=${c}` : "/book"}
            aria-current={category === c ? "page" : undefined}
            className={clsx(
              "flex h-[34px] shrink-0 items-center rounded-full px-4 text-sm no-underline",
              category === c ? "bg-cta font-bold text-cta-ink hover:text-cta-ink" : "border border-field bg-surface text-ink hover:text-ink",
            )}
          >
            {c ? CATEGORY_LABEL[c] : "All"}
          </Link>
        ))}
      </ChipRow>
      <div className="grid grid-cols-3 gap-3" data-testid="collection">
        {shownCards.map((c, i) => (
          <CardTile key={c.id} card={c} i={i} />
        ))}
        {shownWishes.map((w) => (
          <WishTile key={w.id} wish={w} />
        ))}
        {empty.map((c) => (
          <PromptTile
            key={c}
            text={memorial ? MEMORY_PROMPT[c] : PROMPT[c]}
            href={canPost ? newHref(c) : null}
            icon={<CategoryIcon category={c} size={20} />}
          />
        ))}
        {canPost && <PromptTile text={memorial ? "Share a memory" : "Add a wish"} href={newHref(category ?? undefined)} icon={<PlusIcon size={20} />} />}
      </div>
    </>
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
  const memorial = circle.mode === "memorial";
  const [all, wishes] = await Promise.all([
    listBookCards(circle.id, user.id),
    view === "collection" && !memorial ? listVisibleWishes(circle.id, user.id, 100) : Promise.resolve([]),
  ]);
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
      {view === "collection" ? (
        <Collection cards={all} wishes={wishes} category={category} memorial={memorial} canPost={circle.role === "owner"} />
      ) : (
        <Timeline cards={cards} hemisphere={circle.hemisphere} />
      )}
      {view === "timeline" && circle.role === "owner" && (
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
