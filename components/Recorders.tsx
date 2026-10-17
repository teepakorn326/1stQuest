"use client";
import { useEffect, useRef, useState } from "react";
import fixWebmDuration from "fix-webm-duration";
import { MicIcon } from "@/components/icons";
import { VoicePlayer } from "@/components/VoicePlayer";
import { Waveform } from "@/components/Waveform";
import { LIMITS } from "@/lib/mediaLimits";

export type Recording = { blob: Blob; type: string; durationSec: number; url: string; kind: "voice" | "video" };

export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function pickAudioType(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return options.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Records a voice note with MediaRecorder; stops by itself at 5 minutes. */
export function VoiceRecorder({ onDone, onCancel }: { onDone: (r: Recording) => void; onCancel: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const max = LIMITS.voice.maxSeconds!;
  const [levels, setLevels] = useState<number[]>(() => Array(30).fill(6));
  const meter = useRef<{ ctx: AudioContext; raf: number } | null>(null);

  // Live waveform: sample the microphone level and scroll the bars, like the design's player.
  function startMeter(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let prev = 0;
      const loop = (t: number) => {
        if (t - prev > 90) {
          prev = t;
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          const h = Math.round(6 + Math.min(1, peak / 64) * 18);
          setLevels((cur) => [...cur.slice(1), h]);
        }
        if (meter.current) meter.current.raf = requestAnimationFrame(loop);
      };
      meter.current = { ctx, raf: requestAnimationFrame(loop) };
    } catch {
      // No Web Audio: the bars just stay flat.
    }
  }
  function stopMeter() {
    if (!meter.current) return;
    cancelAnimationFrame(meter.current.raf);
    void meter.current.ctx.close();
    meter.current = null;
  }

  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
      stopMeter();
      rec.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = pickAudioType();
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stopMeter();
        stream.getTracks().forEach((t) => t.stop());
        if (tick.current) clearInterval(tick.current);
        const mime = (mr.mimeType || type || "audio/webm").split(";")[0]!;
        const durationSec = Math.min(max, (Date.now() - started.current) / 1000);
        let blob = new Blob(chunks, { type: mime });
        // Chrome's MediaRecorder writes WebM with no duration, so players show the wrong length.
        // Write the real duration into the header before upload.
        if (mime === "audio/webm") blob = await fixWebmDuration(blob, durationSec * 1000, { logger: false }).catch(() => blob);
        onDone({ blob, type: mime, durationSec, url: URL.createObjectURL(blob), kind: "voice" });
      };
      rec.current = mr;
      started.current = Date.now();
      setSeconds(0);
      mr.start(1000);
      startMeter(stream);
      setState("recording");
      tick.current = setInterval(() => {
        const s = (Date.now() - started.current) / 1000;
        setSeconds(s);
        if (s >= max) mr.stop();
      }, 250);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4" data-testid="voice-recorder">
      {state === "error" ? (
        <p className="m-0 text-[15px] text-warm-ink">We couldn’t use the microphone. Check the browser’s permission and try again.</p>
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
        <p className="m-0 text-[15px] text-ink-2">Tap record, then speak. Up to 5 minutes.</p>
      )}
      <div className="flex gap-2">
        {state === "recording" ? (
          <button type="button" onClick={() => rec.current?.stop()} className="h-12 flex-1 rounded-xl bg-cta font-bold text-cta-ink">
            Stop
          </button>
        ) : (
          <button type="button" onClick={start} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cta font-bold text-cta-ink">
            <MicIcon size={20} /> Record
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
