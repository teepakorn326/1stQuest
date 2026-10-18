"use client";
import { useEffect, useRef, useState } from "react";
import { MicIcon } from "@/components/icons";
import { VoicePlayer } from "@/components/VoicePlayer";
import { Waveform } from "@/components/Waveform";
import { LIMITS } from "@/lib/mediaLimits";
import { MIC_PROBLEM_TEXT, MicError, startMic, type MicProblem, type MicSession } from "@/lib/micRecorder";

export type Recording = { blob: Blob; type: string; durationSec: number; url: string; kind: "voice" | "video" };

export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Records a voice note as WAV (see lib/micRecorder.ts); stops by itself at 5 minutes. */
export function VoiceRecorder({ onDone, onCancel }: { onDone: (r: Recording) => void; onCancel: () => void }) {
  const [state, setState] = useState<"idle" | "starting" | "recording" | "error">("idle");
  const [problem, setProblem] = useState<MicProblem>("other");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(30).fill(6));
  const session = useRef<MicSession | null>(null);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const max = LIMITS.voice.maxSeconds!;

  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
      session.current?.cancel();
    };
  }, []);

  function finish() {
    const s = session.current;
    if (!s) return;
    session.current = null;
    if (tick.current) clearInterval(tick.current);
    const { blob, durationSec } = s.stop();
    if (durationSec < 0.5) {
      setState("idle");
      return;
    }
    onDone({ blob, type: "audio/wav", durationSec: Math.min(max, durationSec), url: URL.createObjectURL(blob), kind: "voice" });
  }

  async function start() {
    setState("starting");
    try {
      session.current = await startMic((level) => setLevels((cur) => [...cur.slice(1), Math.round(6 + level * 18)]));
    } catch (err) {
      setProblem(err instanceof MicError ? err.problem : "other");
      setState("error");
      return;
    }
    started.current = Date.now();
    setSeconds(0);
    setState("recording");
    tick.current = setInterval(() => {
      const s = (Date.now() - started.current) / 1000;
      setSeconds(s);
      if (s >= max) finish();
    }, 250);
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4" data-testid="voice-recorder">
      {state === "error" ? (
        <p className="m-0 text-[15px] text-warm-ink" role="alert">
          {MIC_PROBLEM_TEXT[problem]}
        </p>
      ) : state === "recording" ? (
        <div className="flex items-center gap-2.5 rounded-[14px] bg-[#FFF7EA] px-2.5 py-2" data-testid="recording-live">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C0392B]/10" aria-hidden>
            <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-[#C0392B]" />
          </span>
          <Waveform bars={levels} live />
          <span className="shrink-0 text-sm font-bold text-ink-2 tabular-nums" role="timer" aria-live="off">
            {formatDuration(seconds)} / {formatDuration(max)}
          </span>
        </div>
      ) : (
        <p className="m-0 text-[15px] text-ink-2">{state === "starting" ? "Starting the microphone…" : "Tap record, then speak. Up to 5 minutes."}</p>
      )}
      <div className="flex gap-2">
        {state === "recording" ? (
          <button type="button" onClick={finish} className="h-12 flex-1 rounded-xl bg-cta font-bold text-cta-ink" data-testid="voice-stop">
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={state === "starting"}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cta font-bold text-cta-ink disabled:opacity-60"
            data-testid="voice-record"
          >
            <MicIcon size={20} /> {state === "error" ? "Try again" : "Record"}
          </button>
        )}
        <button type="button" onClick={onCancel} className="h-12 rounded-xl px-4 font-bold text-primary">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function RecordingPreview({ r, onRemove }: { r: Recording; onRemove?: () => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {r.kind === "voice" ? (
        <VoicePlayer src={r.url} durationSec={r.durationSec} label="Voice note" />
      ) : (
        <video controls playsInline src={r.url} className="max-h-56 w-full rounded-lg bg-black" />
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="min-h-9 self-end px-1 text-sm font-bold text-primary">
          Remove
        </button>
      )}
    </div>
  );
}
