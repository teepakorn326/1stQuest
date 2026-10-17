import clsx from "clsx";

/** Stable bar heights (6–24px) for a voice note, seeded from its id/url so each note looks its own. */
export function barsFor(seed: string, count = 30): number[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const wave = Math.sin((i / count) * Math.PI); // fuller in the middle, like speech
    out.push(Math.round(6 + ((h % 1000) / 1000) * 12 + wave * 6));
  }
  return out;
}

/** The design's waveform: thin rounded bars; played bars in dark amber, the rest soft amber. */
export function Waveform({ bars, progress = 0, live = false }: { bars: number[]; progress?: number; live?: boolean }) {
  const played = Math.round(progress * bars.length);
  return (
    <div className="flex h-7 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={clsx("w-[3px] shrink-0 rounded-full", live ? "bg-primary transition-[height] duration-100" : i < played ? "bg-primary" : "bg-accent")}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}
