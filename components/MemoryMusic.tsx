"use client";
import { useEffect, useRef, useState } from "react";

const SRC = "/audio/where-rain-meets-light.mp3";
const KEY = "1stquest:memory-music-muted";

/**
 * Soft music that loops while the "In loving memory" page is open and stops when you leave it.
 * Browsers only allow sound after a tap, so if it can't start on its own it starts on your first tap
 * anywhere on the page. A button turns it off (and remembers that on this device).
 */
export function MemoryMusic() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let off = false;
    try {
      off = localStorage.getItem(KEY) === "1";
    } catch {}
    setMuted(off);
    const a = new Audio(SRC);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    audio.current = a;
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);

    let fade: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!audio.current || !a.paused) return;
      a.play()
        .then(() => {
          // Fade in gently rather than starting loud.
          fade = setInterval(() => {
            a.volume = Math.min(0.5, a.volume + 0.05);
            if (a.volume >= 0.5 && fade) clearInterval(fade);
          }, 120);
          document.removeEventListener("pointerdown", start);
        })
        .catch(() => document.addEventListener("pointerdown", start, { once: true }));
    };
    if (!off) start();

    const stop = () => a.pause();
    window.addEventListener("pagehide", stop);
    return () => {
      if (fade) clearInterval(fade);
      document.removeEventListener("pointerdown", start);
      window.removeEventListener("pagehide", stop);
      a.pause();
      a.src = "";
      audio.current = null;
    };
  }, []);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      setMuted(false);
      try {
        localStorage.removeItem(KEY);
      } catch {}
      a.volume = 0.5;
      void a.play().catch(() => {});
    } else {
      a.pause();
      setMuted(true);
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-pressed={playing}
      aria-label={playing ? "Turn the music off" : "Play the music"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/90 text-primary shadow-sm"
      data-testid="memory-music"
      data-playing={playing || undefined}
      data-muted={muted || undefined}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
        {!playing && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}
