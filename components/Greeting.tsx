"use client";
import { useEffect, useState } from "react";

/** Time-of-day greeting in the viewer's own timezone ("Good afternoon, Ploy", or just "Good afternoon"). */
export function Greeting({ name, className }: { name?: string; className?: string }) {
  const [part, setPart] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    setPart(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);
  const hello = part ?? "Hello";
  return <span className={className ?? "text-sm text-ink-3"}>{name ? `${hello}, ${name}` : hello}</span>;
}
