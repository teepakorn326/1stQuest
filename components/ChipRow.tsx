"use client";
import { useEffect, useRef } from "react";

/** A sideways-scrolling row of filter chips that keeps the selected chip in view. */
export function ChipRow({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = row.current;
    const current = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && current) el.scrollLeft = current.offsetLeft - (el.clientWidth - current.offsetWidth) / 2;
  });
  return (
    <nav ref={row} aria-label={label} className={className}>
      {children}
    </nav>
  );
}
