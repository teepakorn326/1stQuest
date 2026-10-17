import Link from "next/link";
import clsx from "clsx";
import { BookIcon, CategoryIcon, PlusIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { CATEGORY_LABEL } from "@/lib/activityText";
import type { RecentCard } from "@/lib/db/queries/cards";

function holds(c: RecentCard): string {
  const parts = [
    c.photos ? (c.photos === 1 ? "A photo" : `${c.photos} photos`) : null,
    c.voices ? (c.voices === 1 ? "a voice note" : `${c.voices} voice notes`) : null,
    c.videos ? (c.videos === 1 ? "a video" : `${c.videos} videos`) : null,
    c.messages ? (c.messages === 1 ? "a message" : `${c.messages} messages`) : null,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return "A written memory";
  const text = parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Home in memorial mode: "Remembering <name>". */
export function MemorialHome({ name, photoSrc, cards, canPost }: { name: string; photoSrc: string | null; cards: RecentCard[]; canPost: boolean }) {
  return (
    <main className="flex flex-col gap-5 px-5 pt-8 pb-5" data-testid="memorial-home">
      <header className="flex flex-col items-center gap-3 text-center">
        <Avatar name={name} seed="patient" size={96} src={photoSrc} tone="bg-[#FFE3B8] text-primary" className="border-4 border-white shadow-[0_2px_8px_rgba(28,43,58,0.12)]" />
        <div className="flex flex-col gap-1">
          <span className="text-[15px] text-ink-3">Remembering</span>
          <h1 className="m-0 text-[26px] font-bold">{name}</h1>
        </div>
        <p className="m-0 max-w-[300px] text-base text-[#4A3926]">
          {name}’s book stays open. {canPost ? "Add the moments you remember, whenever you’re ready." : "Leave a message on the cards whenever you’re ready."}
        </p>
      </header>
      {canPost && (
        <ButtonLink href="/memories/new">
          <PlusIcon size={22} /> Share a memory
        </ButtonLink>
      )}
      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 text-[17px] font-bold">Newly added</h2>
        {cards.length === 0 && (
          <p className="m-0 rounded-2xl border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">
            Memories people share will appear here.
          </p>
        )}
        {cards.map((c) => (
          <Link
            key={c.id}
            href={`/cards/${c.id}`}
            className={clsx(
              "flex gap-3.5 rounded-2xl bg-surface p-3 text-ink no-underline hover:text-ink",
              c.level > 0 ? "gold-frame border-[3px]" : "border border-line",
            )}
          >
            <div className="flex h-[92px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#FFDFAE] text-primary">
              {c.cover_media_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/v1/media/${c.cover_media_id}`} alt="" className="h-full w-full object-cover" />
              ) : (
                <CategoryIcon category={c.category} />
              )}
            </div>
            <div className="flex flex-col justify-center gap-1">
              <span className="text-[13px] font-bold text-primary-hover">
                {CATEGORY_LABEL[c.category]} · from {c.author_name ?? "someone"}
              </span>
              <span className="text-[17px] leading-tight font-bold">{c.title}</span>
              <span className="text-sm text-ink-3">{holds(c)}</span>
            </div>
          </Link>
        ))}
      </section>
      <Link
        href="/book/export"
        className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-field bg-surface text-base font-bold no-underline"
      >
        <BookIcon size={20} /> Make a book for the service
      </Link>
    </main>
  );
}
