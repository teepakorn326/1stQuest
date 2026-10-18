// Records the microphone with Web Audio into a WAV voice note (see lib/wav.ts). Works the same in
// Chrome, Safari, Firefox and on iPhone/Android, where MediaRecorder's formats and quirks differ.
import { encodeWav, Resampler, WAV_RATE } from "@/lib/wav";

export type MicProblem = "unsupported" | "denied" | "no-mic" | "busy" | "other";

export class MicError extends Error {
  constructor(readonly problem: MicProblem) {
    super(problem);
  }
}

export type MicRecording = { blob: Blob; durationSec: number };

export type MicSession = {
  /** Stops and returns the WAV. */
  stop(): MicRecording;
  /** Stops and throws the audio away. */
  cancel(): void;
};

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Call straight from the tap handler: the audio context is created before the first await, which
 * iPhones require. `onLevel` gets 0–1 about ten times a second for the live bars.
 */
export async function startMic(onLevel: (level: number) => void): Promise<MicSession> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) throw new MicError("unsupported");
  const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctx) throw new MicError("unsupported");
  const ctx = new Ctx();

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (err) {
    void ctx.close();
    const name = (err as DOMException)?.name;
    throw new MicError(
      name === "NotAllowedError" || name === "SecurityError"
        ? "denied"
        : name === "NotFoundError" || name === "OverconstrainedError"
          ? "no-mic"
          : name === "NotReadableError" || name === "AbortError"
            ? "busy"
            : "other",
    );
  }
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});

  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is old but runs everywhere (AudioWorklet needs a separate module file).
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const resampler = new Resampler(ctx.sampleRate, WAV_RATE);
  let lastLevel = 0;
  node.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    resampler.push(new Float32Array(input));
    const now = performance.now();
    if (now - lastLevel > 90) {
      lastLevel = now;
      let peak = 0;
      for (let i = 0; i < input.length; i += 8) peak = Math.max(peak, Math.abs(input[i]!));
      onLevel(Math.min(1, peak * 2));
    }
  };
  // The processor only runs while connected to the output; it writes silence, so nothing is heard.
  source.connect(node);
  node.connect(ctx.destination);

  const end = () => {
    node.onaudioprocess = null;
    source.disconnect();
    node.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };

  return {
    stop() {
      end();
      const samples = resampler.samples();
      return { blob: new Blob([encodeWav(samples)], { type: "audio/wav" }), durationSec: samples.length / WAV_RATE };
    },
    cancel: end,
  };
}

export const MIC_PROBLEM_TEXT: Record<MicProblem, string> = {
  unsupported:
    "This browser can’t record. If you opened the link inside LINE, Facebook or Messenger, open it in Safari or Chrome instead.",
  denied:
    "The microphone is blocked. Allow it for this site in the browser’s settings (on iPhone: Settings → Safari → Microphone), then try again.",
  "no-mic": "We couldn’t find a microphone on this device.",
  busy: "The microphone is being used by another app. Close it and try again.",
  other: "We couldn’t start the microphone. Try again.",
};
