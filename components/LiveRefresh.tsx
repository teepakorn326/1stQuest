"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const POLL_MS = 15_000;

/**
 * Keeps server-rendered circle data fresh: refreshes on the circle's Realtime ping (sent by a DB
 * trigger on every activity insert) and polls every 15s as a fallback while the tab is visible.
 * The ping carries no data; the refresh refetches through the normal authenticated pages.
 */
export function LiveRefresh({ circleId, realtime }: { circleId: string; realtime: { url: string; anonKey: string } | null }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 150); // coalesce bursts
    };

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    let cleanupChannel: (() => void) | undefined;
    if (realtime) {
      const sb = createClient(realtime.url, realtime.anonKey, { auth: { persistSession: false } });
      const channel = sb
        .channel(`circle:${circleId}`, { config: { private: false } })
        .on("broadcast", { event: "activity" }, refresh)
        .subscribe();
      cleanupChannel = () => {
        void sb.removeChannel(channel);
      };
    }

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
      cleanupChannel?.();
    };
  }, [circleId, realtime, router]);

  return null;
}
