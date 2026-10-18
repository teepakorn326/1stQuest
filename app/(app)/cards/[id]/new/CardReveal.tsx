"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookIcon, CheckIcon, SparkleIcon } from "@/components/icons";
import { CardFace } from "@/components/CardFace";
import { LogoMark } from "@/components/Logo";
import { CATEGORY_LABEL } from "@/lib/activityText";
import type { Category } from "@/lib/db/types";

type Card = {
  id: string;
  title: string;
  body: string;
  category: Category;
  coverId: string | null;
  dateLabel: string;
  credit: string;
  wishText: string | null;
  canEdit: boolean;
};

const SPARKLES = [
  { top: 70, left: 40, size: 22, delay: "0s" },
  { top: 120, right: 36, size: 16, delay: ".6s" },
  { top: 520, left: 30, size: 18, delay: "1.1s" },
  { top: 470, right: 44, size: 24, delay: ".3s" },
];

export function CardReveal({ card, patientName }: { card: Card; patientName: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"reveal" | "collecting" | "saved" | "reset">("reveal");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const saved = phase === "saved";
  const book = `${patientName}’s book`;

  async function saveWords(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/v1/cards/${card.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) return setError(data?.error?.message ?? "Please try again.");
    setEditing(false);
    router.refresh();
  }

  return (
    <main className="relative -mb-[96px] flex min-h-dvh flex-col items-center gap-6 overflow-hidden bg-[#3A2410] px-6 pt-10 pb-[112px] text-white">
      {SPARKLES.map((sp, i) => (
        <span
          key={i}
          aria-hidden
          className="reveal-twinkle absolute text-[#E9C46A]"
          style={{ top: sp.top, left: sp.left, right: sp.right, animationDelay: sp.delay }}
        >
          <SparkleIcon size={sp.size} />
        </span>
      ))}

      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="m-0 text-2xl font-bold">{saved ? `Added to ${book}` : "A new card for the book"}</h1>
        <p className="m-0 text-base text-[#F3DEC0]">{saved ? card.wishText : card.credit}</p>
      </div>

      <div className="relative flex min-h-[300px] w-[290px] items-center justify-center">
        {(phase === "reveal" || phase === "collecting") && !editing && (
          <div className={phase === "collecting" ? "reveal-collecting w-[290px]" : "w-[290px]"} data-testid="reveal-card">
            <div className="reveal-stage">
              <div className="reveal-card">
                <CardFace title={title} body={body} category={card.category} coverId={card.coverId} dateLabel={card.dateLabel} />
                <div className="reveal-face reveal-back flex items-center justify-center rounded-[20px] border-[3px] border-[#F3E2C6] bg-cta" aria-hidden>
                  <div className="flex h-[340px] w-[200px] flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-accent text-cta-ink">
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface shadow-[0_4px_14px_rgba(122,74,0,0.25)]">
                      <LogoMark size={64} />
                    </span>
                    <span className="text-base font-bold tracking-wide">1stQuest</span>
                  </div>
                </div>
              </div>
            </div>
            <SparkleIcon size={40} className="reveal-burst absolute -top-4 -left-4 text-[#E9C46A]" />
            <SparkleIcon size={32} className="reveal-burst absolute -right-3 -bottom-3 text-[#E9C46A]" />
          </div>
        )}

        {editing && (
          <form onSubmit={saveWords} className="reveal-fade-in flex w-full flex-col gap-3 rounded-[20px] bg-surface p-4 text-ink">
            <label htmlFor="card-title" className="text-sm font-bold">
              Title
            </label>
            <input
              id="card-title"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-[14px] border-[1.5px] border-field px-3 text-[17px] font-bold"
            />
            <label htmlFor="card-body" className="text-sm font-bold">
              Words
            </label>
            <textarea
              id="card-body"
              value={body}
              rows={6}
              maxLength={600}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none rounded-[14px] border-[1.5px] border-field px-3 py-2 text-[15px] leading-relaxed"
            />
            {error && <p className="m-0 text-sm text-warm-ink">{error}</p>}
            <button type="submit" className="h-12 rounded-[14px] bg-cta font-bold text-cta-ink">
              Save the words
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-11 font-bold text-primary">
              Cancel
            </button>
          </form>
        )}

        {saved && (
          <div className="reveal-fade-in flex flex-col items-center gap-3.5 text-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft text-primary-hover">
              <CheckIcon size={34} />
            </div>
            <p className="m-0 text-xl font-bold">Saved in {CATEGORY_LABEL[card.category]}</p>
            <p className="m-0 max-w-[250px] text-base text-[#F3DEC0]">The family can now like it and leave messages.</p>
          </div>
        )}
      </div>

      <div className="mt-auto flex w-full max-w-[342px] flex-col gap-2.5">
        {phase === "reveal" && !editing && (
          <>
            <button
              type="button"
              onClick={() => {
                setPhase("collecting");
                later(() => setPhase("saved"), 950);
              }}
              className="h-[52px] rounded-[14px] bg-surface text-[17px] font-bold text-primary-hover"
              data-testid="add-to-book"
            >
              Add to the book
            </button>
            {card.canEdit && (
              <button type="button" onClick={() => setEditing(true)} className="h-[52px] rounded-[14px] border-[1.5px] border-[#A0784A] text-[17px] font-bold text-white">
                Change the words
              </button>
            )}
          </>
        )}
        {saved && (
          <>
            <Link href={`/cards/${card.id}`} className="flex h-[52px] items-center justify-center rounded-[14px] bg-surface text-[17px] font-bold text-primary-hover no-underline hover:text-primary-hover">
              Open the card
            </Link>
            <button
              type="button"
              onClick={() => {
                setPhase("reset");
                later(() => setPhase("reveal"), 40);
              }}
              className="h-[52px] rounded-[14px] border-[1.5px] border-[#A0784A] text-[17px] font-bold text-white"
            >
              Play again
            </button>
          </>
        )}
        <div className="flex justify-center pt-1">
          <Link
            href="/book"
            aria-label={book}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border-[1.5px] border-[#7A5426] bg-[#5C3B12] text-primary-soft hover:text-primary-soft ${saved ? "reveal-bump" : ""}`}
          >
            <BookIcon size={28} />
          </Link>
        </div>
      </div>
    </main>
  );
}
