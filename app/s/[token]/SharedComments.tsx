"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label, Textarea } from "@/components/ui/Field";

type Message = { id: string; name: string; text: string; created_at: string; guest: boolean };
const NAME_KEY = "1stquest:guest-name";

/** Comments on a shared card: everyone can read them, and anyone with the link can add one with their name. */
export function SharedComments({ token, patientName, messages }: { token: string; patientName: string; messages: Message[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [website, setWebsite] = useState(""); // hidden spam trap
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    if (!name.trim()) return setError("Add your name.");
    if (!text.trim()) return setError("Write a message.");
    setBusy(true);
    const res = await fetch(`/api/v1/share/${token}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, text, website }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "Your message didn’t send. Try again.");
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
    setText("");
    setSent(true);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3" data-testid="shared-comments">
      <h2 className="m-0 text-lg font-bold">Messages for {patientName}</h2>
      {messages.length === 0 && <p className="m-0 text-[15px] text-ink-3">No messages yet. Be the first to leave one.</p>}
      {messages.map((m) => (
        <div key={m.id} className="flex gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2.5" data-testid="shared-message">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
            {m.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <p className="m-0 min-w-0 flex-1 text-[15px] leading-snug break-words">
            <b>{m.name}</b>
            <br />
            {m.text}
          </p>
        </div>
      ))}

      <form onSubmit={send} className="m-0 flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-4" data-testid="shared-comment-form">
        <h3 className="m-0 text-base font-bold">Leave a message</h3>
        <Label htmlFor="g-name">Your name</Label>
        <Input id="g-name" autoComplete="name" maxLength={60} placeholder="e.g. Aunty Noi" value={name} onChange={(e) => setName(e.target.value)} />
        <Label htmlFor="g-text">Message</Label>
        <Textarea id="g-text" rows={3} maxLength={500} placeholder={`Say something to ${patientName} and the family`} value={text} onChange={(e) => setText(e.target.value)} />
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
        <FormError message={error} />
        {sent && (
          <p className="m-0 text-sm text-primary" role="status">
            Thank you. Your message is on the card.
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full" data-testid="shared-comment-send">
          {busy ? "Sending…" : "Send"}
        </Button>
        <p className="m-0 text-xs text-ink-3">Everyone with this link can read messages here. The family can remove any message.</p>
      </form>
    </section>
  );
}
