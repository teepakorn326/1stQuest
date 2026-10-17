"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, MicIcon, SendIcon } from "@/components/icons";
import type { Category } from "@/lib/db/types";

type Suggestion = { text: string; category: Category };
type Msg = { id: string; role: "user" | "assistant"; content: string; suggestion: Suggestion | null };

const CHIPS = ["A taste I miss", "Someone to see", "A song that matters", "Another question"];

// Minimal typing for the Web Speech API (not in TS's DOM lib everywhere).
type Recognition = {
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(s.text);
  const go = () => router.push(`/wishes/new?${new URLSearchParams({ text, category: s.category })}`);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-[#A9C8E2] bg-primary-soft p-4" data-testid="suggestion">
      <span className="text-sm font-bold text-primary-hover">This could be a wish</span>
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          aria-label="Edit the wish"
          className="w-full resize-none rounded-xl border-[1.5px] border-[#A9C8E2] bg-surface px-3 py-2 text-[17px] font-bold"
        />
      ) : (
        <p className="m-0 text-[17px] leading-snug font-bold">{text}</p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={go} className="h-12 flex-1 rounded-xl bg-primary text-base font-bold text-white">
          Save as a wish
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-12 rounded-xl border-[1.5px] border-[#A9C8E2] bg-surface px-4 text-base font-bold text-primary"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export function TalkChat({ circleId, initial }: { circleId: string; initial: Msg[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanSpeak(getRecognition() !== null);
  }, []);
  // Block bodies: scrollIntoView returns a Promise in newer browsers, which React would treat as a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, error]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || pending) return;
    setError(null);
    setPending(t);
    setDraft("");
    const res = await fetch(`/api/v1/circles/${circleId}/talk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: t }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error?.message ?? "I couldn’t reply just now. Try sending it again.");
      setDraft(t); // keep their words
      setPending(null);
      return;
    }
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: t, suggestion: null }, data.message]);
    setPending(null);
  }

  function toggleMic() {
    if (listening) return recRef.current?.stop();
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = navigator.language || "en-AU";
    rec.interimResults = true;
    const before = draft ? `${draft} ` : "";
    rec.onresult = (e) => {
      const said = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join("");
      setDraft(before + said);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function startOver() {
    await fetch(`/api/v1/circles/${circleId}/talk`, { method: "DELETE" }).catch(() => null);
    router.refresh();
    setMessages([]);
    setError(null);
  }

  // Server refresh after "start over" brings a new opener.
  useEffect(() => {
    setMessages(initial);
  }, [initial]);

  return (
    <main className="flex min-h-[calc(100dvh-96px)] flex-col">
      <header className="flex items-center gap-2 border-b border-line px-3 pt-4 pb-3">
        <Link href="/wishes" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:text-ink">
          <ChevronLeft />
        </Link>
        <div className="flex flex-1 flex-col gap-0.5">
          <h1 className="m-0 text-xl font-bold">Talk it through</h1>
          <span className="text-sm text-ink-3">Answer as much or as little as you like</span>
        </div>
        {messages.length > 1 && (
          <button type="button" onClick={startOver} className="min-h-11 px-2 text-sm font-bold text-primary">
            Start over
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-5 pb-3" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-3.5">
            <div
              className={clsx(
                "max-w-[85%] px-4 py-3.5 text-[17px] leading-normal",
                m.role === "assistant"
                  ? "self-start rounded-[18px_18px_18px_6px] border border-line bg-surface"
                  : "self-end rounded-[18px_18px_6px_18px] bg-primary text-white",
              )}
            >
              {m.content}
            </div>
            {m.suggestion && <SuggestionCard s={m.suggestion} />}
          </div>
        ))}
        {pending && (
          <>
            <div className="max-w-[85%] self-end rounded-[18px_18px_6px_18px] bg-primary px-4 py-3.5 text-[17px] text-white">{pending}</div>
            <div className="self-start rounded-[18px_18px_18px_6px] border border-line bg-surface px-4 py-3.5 text-ink-3" role="status">
              <span className="inline-flex gap-1" aria-label="Thinking">
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:240ms]" />
              </span>
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="m-0 rounded-[14px] bg-warm px-4 py-3 text-[15px] text-warm-ink">
            {error}
          </p>
        )}
        {/* Scroll margin = composer + bottom nav, which overlay the end of the thread. */}
        <div ref={endRef} className="scroll-mb-[230px]" />
      </div>

      <div className="sticky bottom-[76px] flex flex-col gap-2.5 border-t border-line bg-surface px-4 pt-3 pb-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={Boolean(pending)}
              onClick={() => send(c)}
              className="h-10 shrink-0 rounded-[20px] border-[1.5px] border-field bg-surface px-3.5 text-[15px] text-ink disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        <form
          className="m-0 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          {canSpeak && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Stop listening" : "Record a voice answer"}
              aria-pressed={listening}
              className={clsx(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                listening ? "animate-pulse bg-primary text-white" : "bg-primary-soft text-primary",
              )}
            >
              <MicIcon />
            </button>
          )}
          <label htmlFor="reply" className="sr-only">
            Your answer
          </label>
          <input
            id="reply"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            autoComplete="off"
            placeholder={canSpeak ? "Type or speak your answer" : "Type your answer"}
            className="h-12 min-w-0 flex-1 rounded-3xl border-[1.5px] border-field bg-bg px-4 text-base text-ink focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim() || Boolean(pending)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
          >
            <SendIcon size={22} />
          </button>
        </form>
      </div>
    </main>
  );
}
