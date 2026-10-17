"use client";
import { useEffect, useState } from "react";

/** Time-of-day greeting in the viewer's own timezone. */
export function Greeting({ name }: { name: string }) {
  const [part, setPart] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    setPart(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);
  return <span className="text-sm text-ink-3">{part ? `${part}, ${name}` : `Hello, ${name}`}</span>;
}
