"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { SparkleIcon } from "@/components/icons";

export const GOLD_EVENT = "1stquest:card-gold";

const BURST = [
  { top: "-14px", left: "-12px", size: 34, delay: "0ms" },
  { top: "18%", right: "-16px", size: 26, delay: "120ms" },
  { bottom: "22%", left: "-16px", size: 24, delay: "220ms" },
  { bottom: "-14px", right: "12%", size: 32, delay: "60ms" },
  { top: "-16px", right: "28%", size: 20, delay: "300ms" },
];

/**
 * The card's frame. Gold cards get a gold border and a gentle shimmer; the moment a card turns
 * gold it pulses, glows, sweeps with light and throws sparkles (all off with reduced motion).
 */
export function GoldCardFrame({ cardId, level, children }: { cardId: string; level: number; children: React.ReactNode }) {
  const [celebrating, setCelebrating] = useState(false);
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

  return (
    <div className="relative">
      <article
        className={clsx(
          "relative flex flex-col overflow-hidden rounded-[20px] border-4 bg-surface transition-colors duration-700",
          gold ? "gold-card border-gold" : "border-[#F3E2C6]",
          celebrating && "gold-celebrate",
        )}
        data-level={gold ? 1 : 0}
        data-testid="card-frame"
      >
        {children}
        {gold && <span aria-hidden className="gold-sheen" />}
      </article>
      {celebrating &&
        BURST.map((b, i) => (
          <span key={i} aria-hidden className="gold-spark absolute text-gold" style={{ top: b.top, left: b.left, right: b.right, bottom: b.bottom, animationDelay: b.delay }}>
            <SparkleIcon size={b.size} />
          </span>
        ))}
    </div>
  );
}
