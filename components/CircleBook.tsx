"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, PlusIcon } from "@/components/icons";

type C = { id: string; patient_name: string };

/** The circle as a little book (from the "Circle home" design): spine, cover label with their photo or initial. */
function BookArt({ name, photoSrc }: { name: string; photoSrc: string | null }) {
  return (
    <span aria-hidden className="relative block h-[130px] w-[102px]">
      <span className="absolute top-1.5 left-1.5 h-[124px] w-24 rounded-r-[10px] rounded-l-[4px] bg-[#E8C48A]" />
      <span className="absolute top-0 left-0 h-[124px] w-24 overflow-hidden rounded-r-[10px] rounded-l-[4px] bg-cta shadow-[0_6px_16px_rgba(168,100,0,0.18)]">
        <span className="absolute inset-y-0 left-0 w-[18px] bg-gold">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="absolute left-1.5 h-1.5 w-1.5 rounded-[1px] bg-[#FFF7EA]" style={{ top: 11 + i * 16 }} />
          ))}
        </span>
        <span className="absolute top-6 left-[30px] flex h-11 w-14 items-center justify-center overflow-hidden rounded-md bg-[#FFF7EA] text-2xl font-bold text-primary">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            name.trim().charAt(0).toUpperCase()
          )}
        </span>
        <span className="absolute top-20 left-[30px] h-1 w-14 rounded-full bg-[#FFE0AE]" />
        <span className="absolute top-[90px] left-[30px] h-1 w-10 rounded-full bg-[#FFE0AE]" />
      </span>
    </span>
  );
}

/**
 * The circle you're looking at, drawn as its book. With more than one circle, tapping the book (or its
 * name) opens a list of your circles to switch between.
 */
export function CircleBook({ current, circles, ownerName, photoSrc }: { current: C; circles: C[]; ownerName: string | null; photoSrc: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const many = circles.length > 1;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

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

  const label = (
    <>
      <BookArt name={current.patient_name} photoSrc={photoSrc} />
      {ownerName && <span className="mt-2.5 text-sm text-ink-3">Owner · {ownerName}</span>}
      <span className="flex items-center gap-1.5 text-2xl leading-tight font-bold text-ink">
        {current.patient_name}’s circle
        {many && <ChevronDown size={20} className={clsx("text-ink-3 transition-transform", open && "rotate-180")} />}
      </span>
    </>
  );

  return (
    <div ref={box} className="relative flex flex-col items-center" data-testid="circle-book">
      {many ? (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`${current.patient_name}’s circle. Switch circle`}
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col items-center text-center"
        >
          {label}
        </button>
      ) : (
        <div className="flex flex-col items-center text-center">{label}</div>
      )}
      {open && (
        <div
          className="absolute top-10 left-1/2 z-30 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
          role="listbox"
          aria-label="Your circles"
          data-testid="circle-menu"
        >
          {circles.map((c) => (
            <button
              key={c.id}
              role="option"
              aria-selected={c.id === current.id}
              type="button"
              onClick={() => choose(c.id)}
              className={clsx("flex min-h-12 w-full items-center gap-3 border-b border-[#F6EBDA] px-4 text-left text-base", c.id === current.id ? "font-bold text-primary" : "text-ink")}
            >
              <span className="flex h-8 w-7 shrink-0 items-center justify-center rounded-r-[5px] rounded-l-[2px] border-l-4 border-gold bg-cta text-sm font-bold text-cta-ink">
                {c.patient_name.trim().charAt(0).toUpperCase()}
              </span>
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
