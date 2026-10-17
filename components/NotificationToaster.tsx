"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BellIcon } from "@/components/icons";

type Latest = { id: string; text: string; circle: string; url: string } | null;

/**
 * Live pop-up when the owner posts. Listens on the viewer's own Realtime topic (a data-free ping
 * sent by a trigger on notifications) and polls every 30s as a fallback.
 */
export function NotificationToaster({ userId, realtime }: { userId: string; realtime: { url: string; anonKey: string } | null }) {
  const router = useRouter();
  const [toast, setToast] = useState<Latest>(null);
  const seen = useRef<string | null>(null);
  const first = useRef(true);

  const check = useCallback(async () => {
    const res = await fetch("/api/v1/notifications/latest").catch(() => null);
    if (!res?.ok) return;
    const { latest } = (await res.json()) as { latest: Latest };
    if (first.current) {
      // Don't pop up for what was already waiting when the page opened.
      first.current = false;
      seen.current = latest?.id ?? null;
      return;
    }
    if (latest && latest.id !== seen.current) {
      seen.current = latest.id;
      setToast(latest);
      router.refresh(); // bell count (client state, including this toast, survives the refresh)
      setTimeout(() => setToast((t) => (t?.id === latest.id ? null : t)), 6000);
    }
  }, [router]);

  // Primitive deps: the server re-creates the `realtime` object on every refresh, and re-running
  // this effect on each one would reset the subscription and poll timer.
  const rtUrl = realtime?.url;
  const rtKey = realtime?.anonKey;
  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    const run = () => void checkRef.current();
    run();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, 30_000);
    let stop: (() => void) | undefined;
    if (rtUrl && rtKey) {
      const sb = createClient(rtUrl, rtKey, { auth: { persistSession: false } });
      const ch = sb.channel(`user:${userId}`, { config: { private: false } }).on("broadcast", { event: "notification" }, run).subscribe();
      stop = () => {
        void sb.removeChannel(ch);
      };
    }
    return () => {
      clearInterval(poll);
      stop?.();
    };
  }, [userId, rtUrl, rtKey]);

  if (!toast) return null;
  return (
    <Link
      href={toast.url}
      onClick={() => setToast(null)}
      role="status"
      className="reveal-fade-in fixed inset-x-3 top-3 z-40 mx-auto flex max-w-[456px] items-start gap-3 rounded-2xl border border-accent bg-surface px-4 py-3 text-ink no-underline shadow-lg hover:text-ink"
      data-testid="notification-toast"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <BellIcon size={18} />
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-bold">{toast.text}</span>
        <span className="text-sm text-ink-3">{toast.circle}’s circle · tap to open</span>
      </span>
    </Link>
  );
}
