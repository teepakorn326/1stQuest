"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, CloseIcon } from "@/components/icons";

type Slide = { id: string; title: string; body: string; meta: string; photoId: string | null; gold: boolean };

const AUTO_MS = 8000;

/** Full-screen slideshow: ←/→/space, tap the left or right half, swipe; optional auto-play. */
export function Slideshow({ name, memorial, slides }: { name: string; memorial: boolean; slides: Slide[] }) {
  const router = useRouter();
  const total = slides.length + 1; // cover + one per card
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((d: number) => setI((n) => Math.min(total - 1, Math.max(0, n + d))), [total]);
  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    router.push("/book");
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(total - 1);
      else if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, exit, total]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((n) => (n + 1) % total), AUTO_MS);
    return () => clearInterval(t);
  }, [playing, total]);

  const slide = i === 0 ? null : slides[i - 1]!;

  return (
    <main
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#22374A] text-white select-none"
      data-testid="slideshow"
      data-slide={i}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(end - start) > 50) go(end < start ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="absolute top-3 right-3 left-3 z-10 flex items-center justify-between gap-2">
        <button type="button" onClick={exit} aria-label="Close the slideshow" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30">
          <CloseIcon />
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPlaying((p) => !p)} className="h-11 rounded-full bg-black/30 px-4 text-[15px] font-bold" aria-pressed={playing}>
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
            className="h-11 rounded-full bg-black/30 px-4 text-[15px] font-bold"
          >
            Full screen
          </button>
        </div>
      </div>

      {/* Tap zones */}
      <button type="button" aria-label="Previous" onClick={() => go(-1)} className="absolute inset-y-0 left-0 z-0 w-1/3" />
      <button type="button" aria-label="Next" onClick={() => go(1)} className="absolute inset-y-0 right-0 z-0 w-1/3" />

      <div key={i} className="reveal-fade-in pointer-events-none relative flex flex-1 flex-col items-center justify-center px-6 py-20" aria-live="polite">
        {slide === null ? (
          <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
            <span className="text-lg text-[#C9D8E5]">{memorial ? "Remembering" : "Wish Circle"}</span>
            <h1 className="m-0 text-4xl font-bold sm:text-6xl">{memorial ? name : `${name}’s book`}</h1>
            <p className="m-0 text-lg text-[#C9D8E5]">
              {slides.length === 0 ? "The first pages are still to come." : `${slides.length === 1 ? "1 card" : `${slides.length} cards`}, made together`}
            </p>
          </div>
        ) : (
          <div className="flex h-full w-full max-w-5xl flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            {slide.photoId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/v1/media/${slide.photoId}`}
                alt=""
                className={clsx("max-h-[55vh] max-w-full rounded-2xl object-contain shadow-2xl sm:max-h-[75vh] sm:max-w-[55%]", slide.gold && "ring-4 ring-gold")}
              />
            )}
            <div className={clsx("flex max-w-xl flex-col gap-3", !slide.photoId && "items-center text-center")}>
              <span className="text-sm font-bold tracking-wide text-[#A9C8E2] uppercase">{slide.meta}</span>
              <h2 className="m-0 text-3xl leading-tight font-bold sm:text-5xl">{slide.title}</h2>
              <p className="m-0 text-lg leading-relaxed text-[#DCEBF7] sm:text-2xl">{slide.body}</p>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4 pb-6">
        <button type="button" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 disabled:opacity-30">
          <ChevronLeft />
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: total }, (_, n) => (
            <span key={n} className={clsx("h-1.5 rounded-full transition-all", n === i ? "w-6 bg-white" : "w-1.5 bg-white/40")} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} disabled={i === total - 1} aria-label="Next" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 disabled:opacity-30">
          <ChevronRight />
        </button>
      </div>
    </main>
  );
}
