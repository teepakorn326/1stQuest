"use client";
import { useEffect, useRef, useState } from "react";

// Minimal typing for the Web Speech API (not in TS's DOM lib everywhere).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Speech-to-text into a text field: appends what's said to the text already there. */
export function useDictation(text: string, setText: (t: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(createRecognition() !== null);
    return () => rec.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = createRecognition();
    if (!r) return;
    r.lang = navigator.language || "en-AU";
    r.interimResults = true;
    r.continuous = true;
    const before = text.trim() ? `${text.trim()} ` : "";
    r.onresult = (e) => setText(before + Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(""));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  return { supported, listening, toggle };
}
