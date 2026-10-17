"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Voice note player that always shows the right length: it uses the length we recorded, and
 * nudges browsers that can't read a WebM file's duration into working it out (for seeking).
 */
export function VoicePlayer({ src, durationSec, label }: { src: string; durationSec: number | null; label?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const total = mediaDuration ?? durationSec ?? 0;

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    let probing = false;
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setMediaDuration(a.duration);
      else {
        // Infinite duration (WebM without a header): seek far ahead so the browser scans the file.
        probing = true;
        a.currentTime = 1e7;
      }
    };
    const onDurationChange = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setMediaDuration(a.duration);
        if (probing) {
          probing = false;
          a.currentTime = 0;
        }
      }
    };
    const onTime = () => {
      if (!probing) setTime(a.currentTime);
    };
    const onEnd = () => {
      setPlaying(false);
      setTime(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [src]);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audio.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(total, ((e.clientX - rect.left) / rect.width) * total));
    setTime(a.currentTime);
  }

  const pct = total ? Math.min(100, (time / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5" data-testid="voice-player">
      <audio ref={audio} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cta text-cta-ink"
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.5v13l11-6.5z" /></svg>
        )}
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Position in voice note"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(time)}
        onClick={seek}
        onKeyDown={(e) => {
          const a = audio.current;
          if (!a) return;
          if (e.key === "ArrowRight") a.currentTime = Math.min(total, a.currentTime + 5);
          if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5);
        }}
        className="relative h-2 flex-1 cursor-pointer rounded-full bg-[#F3E2C6]"
      >
        <div className={clsx("absolute inset-y-0 left-0 rounded-full bg-primary", playing && "transition-[width] duration-200")} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-sm text-ink-2 tabular-nums" data-testid="voice-time">
        {label ? `${label} · ` : ""}
        {fmt(time)} / {fmt(total)}
      </span>
    </div>
  );
}
