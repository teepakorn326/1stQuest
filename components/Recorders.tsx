"use client";
import { useEffect, useRef, useState } from "react";
import { MicIcon } from "@/components/icons";
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

  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
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
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (tick.current) clearInterval(tick.current);
        const mime = (mr.mimeType || type || "audio/webm").split(";")[0]!;
        const blob = new Blob(chunks, { type: mime });
        const durationSec = Math.min(max, (Date.now() - started.current) / 1000);
        onDone({ blob, type: mime, durationSec, url: URL.createObjectURL(blob), kind: "voice" });
      };
      rec.current = mr;
      started.current = Date.now();
      setSeconds(0);
      mr.start(1000);
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
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#C0392B]" aria-hidden />
          <span className="flex-1 text-base font-bold" role="timer" aria-live="off">
            Recording {formatDuration(seconds)}
          </span>
          <span className="text-sm text-ink-3">up to {formatDuration(max)}</span>
        </div>
      ) : (
        <p className="m-0 text-[15px] text-ink-2">Tap record, then speak. Up to 5 minutes.</p>
      )}
      <div className="flex gap-2">
        {state === "recording" ? (
          <button type="button" onClick={() => rec.current?.stop()} className="h-12 flex-1 rounded-xl bg-primary font-bold text-white">
            Stop
          </button>
        ) : (
          <button type="button" onClick={start} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white">
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

/** Reads a picked video's duration and enforces the 2-minute / 50MB limits before upload. */
export async function readVideo(file: File): Promise<Recording> {
  const limit = LIMITS.video;
  if (!limit.types.includes(file.type)) throw new Error("Videos can be MP4, WebM or MOV.");
  if (file.size > limit.maxBytes) throw new Error(limit.label);
  const url = URL.createObjectURL(file);
  const durationSec = await new Promise<number>((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(v.duration);
    v.onerror = () => reject(new Error("We couldn’t read that video."));
    v.src = url;
  });
  if (!Number.isFinite(durationSec) || durationSec > limit.maxSeconds! + 1) {
    URL.revokeObjectURL(url);
    throw new Error(limit.label);
  }
  return { blob: file, type: file.type, durationSec, url, kind: "video" };
}

export function RecordingPreview({ r, onRemove }: { r: Recording; onRemove?: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-3">
      <div className="flex items-center justify-between text-sm text-ink-2">
        <span className="font-bold">
          {r.kind === "voice" ? "Voice note" : "Video"} · {formatDuration(r.durationSec)}
        </span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="min-h-11 px-2 font-bold text-primary">
            Remove
          </button>
        )}
      </div>
      {r.kind === "voice" ? (
        <audio controls src={r.url} className="w-full" />
      ) : (
        <video controls playsInline src={r.url} className="max-h-56 w-full rounded-lg bg-black" />
      )}
    </div>
  );
}
