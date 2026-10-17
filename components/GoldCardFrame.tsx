"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BookIcon, SparkleIcon } from "@/components/icons";

export const GOLD_EVENT = "1stquest:card-gold";

const BURST = [
  { top: "-14px", left: "-12px", size: 34, delay: "0ms" },
  { top: "18%", right: "-16px", size: 26, delay: "120ms" },
  { bottom: "22%", left: "-16px", size: 24, delay: "220ms" },
  { bottom: "-14px", right: "12%", size: 32, delay: "60ms" },
  { top: "-16px", right: "28%", size: 20, delay: "300ms" },
];

// Stars that twinkle around the card while it turns over (like the new-card reveal).
const TWINKLES = [
  { top: "6%", left: "-18px", size: 18, delay: "0ms" },
  { top: "-18px", left: "30%", size: 14, delay: "180ms" },
  { top: "34%", right: "-20px", size: 20, delay: "90ms" },
  { bottom: "8%", right: "-14px", size: 14, delay: "320ms" },
  { bottom: "-18px", left: "22%", size: 18, delay: "240ms" },
  { top: "58%", left: "-20px", size: 12, delay: "420ms" },
];

type Spot = { top?: string; left?: string; right?: string; bottom?: string; size: number; delay: string };

function Sparkles({ spots, className }: { spots: Spot[]; className: string }) {
  return (
    <>
      {spots.map((b, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx("pointer-events-none absolute z-20 text-gold", className)}
          style={{ top: b.top, left: b.left, right: b.right, bottom: b.bottom, animationDelay: b.delay }}
        >
          <SparkleIcon size={b.size} />
        </span>
      ))}
    </>
  );
}

/** Back of a card, seen while it turns over. */
function CardBack({ gold }: { gold: boolean }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "card-face card-back flex items-center justify-center rounded-[20px] border-4 bg-cta p-4",
        gold ? "gold-frame" : "border-[#F3E2C6]",
      )}
      data-testid="card-back"
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-[#FFE3B8] text-cta-ink">
        <SparkleIcon size={22} className="text-[#FFF1DA]" />
        <BookIcon size={56} />
        <span className="text-lg font-bold tracking-wide">1stQuest</span>
        <SparkleIcon size={22} className="text-[#FFF1DA]" />
      </div>
    </div>
  );
}

/**
 * The card's frame.
 * - Gold cards: gold border, a slowly turning gold aura behind the card, and a gentle shimmer.
 * - Turning gold: the card pulses, glows, sweeps with light and throws sparkles; the aura flares.
 * - First comment: the card turns over once, showing its back, with twinkling stars, a sparkle
 *   burst and a shine as it lands (for everyone viewing: it reacts to the comment count).
 * All motion is off with reduced-motion settings.
 */
export function GoldCardFrame({
  cardId,
  level,
  messageCount,
  children,
}: {
  cardId: string;
  level: number;
  messageCount: number;
  children: React.ReactNode;
}) {
  const [celebrating, setCelebrating] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const prevCount = useRef(messageCount);
  const gold = level > 0 || celebrating;

  useEffect(() => {
    const onGold = (e: Event) => {
      if ((e as CustomEvent<{ cardId: string }>).detail?.cardId !== cardId) return;
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 2600);
    };
    window.addEventListener(GOLD_EVENT, onGold);
    return () => window.removeEventListener(GOLD_EVENT, onGold);
  }, [cardId]);

  useEffect(() => {
    if (prevCount.current === 0 && messageCount > 0) {
      setSpinning(true);
      const t = setTimeout(() => setSpinning(false), 2900);
      prevCount.current = messageCount;
      return () => clearTimeout(t);
    }
    prevCount.current = messageCount;
  }, [messageCount]);

  return (
    <div className="card-spin-stage relative">
      {gold && <span aria-hidden className={clsx("gold-aura", celebrating && "gold-celebrate-aura")} data-testid="gold-aura" />}
      <div
        className={clsx("card-flipper z-10", spinning && "card-spin")}
        data-testid="card-spin"
        data-spinning={spinning || undefined}
      >
        <article
          className={clsx(
            "card-face relative flex flex-col overflow-hidden rounded-[20px] border-4 bg-surface transition-colors duration-700",
            gold ? "gold-card gold-frame" : "border-[#F3E2C6]",
            celebrating && "gold-celebrate",
          )}
          data-level={gold ? 1 : 0}
          data-testid="card-frame"
        >
          {children}
          {gold && (
            <>
              <span aria-hidden className="gold-sheen" />
              <span aria-hidden className="gold-gloss" />
            </>
          )}
          {spinning && <span aria-hidden className="card-spin-shine" />}
        </article>
        <CardBack gold={gold} />
      </div>
      {celebrating && <Sparkles spots={BURST} className="gold-spark" />}
      {spinning && (
        <>
          <Sparkles spots={TWINKLES} className="card-spin-twinkle" />
          <Sparkles spots={BURST} className="card-spin-burst" />
        </>
      )}
    </div>
  );
}
