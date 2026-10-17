"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, PlusIcon } from "@/components/icons";

type C = { id: string; patient_name: string };

export function CircleSwitcher({ current, circles }: { current: C; circles: C[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(id: string) {
    if (id === current.id) return setOpen(false);
    setBusy(id);
    await fetch("/api/v1/circles/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ circleId: id }),
    }).catch(() => null);
    setBusy(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-left text-[22px] leading-tight font-bold text-ink"
      >
        {current.patient_name}’s circle
        <ChevronDown size={20} className={clsx("text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg" role="listbox" aria-label="Your circles">
          {circles.map((c) => (
            <button
              key={c.id}
              role="option"
              aria-selected={c.id === current.id}
              type="button"
              onClick={() => choose(c.id)}
              className={clsx(
                "flex min-h-12 w-full items-center border-b border-[#E6EEF4] px-4 text-left text-base",
                c.id === current.id ? "font-bold text-primary" : "text-ink",
              )}
            >
              {busy === c.id ? "Opening…" : `${c.patient_name}’s circle`}
            </button>
          ))}
          <Link href="/circles/new" className="flex min-h-12 items-center gap-2 px-4 text-base font-bold no-underline">
            <PlusIcon size={18} /> Start another circle
          </Link>
        </div>
      )}
    </div>
  );
}
