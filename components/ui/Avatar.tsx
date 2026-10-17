import clsx from "clsx";

const tones = [
  "bg-primary-soft text-primary",
  "bg-warm text-warm-ink",
  "bg-[#E9EEF2] text-ink-2",
  "bg-[#C7DCEE] text-primary",
];

export function initialOf(name: string | null | undefined, fallback = "?"): string {
  return (name?.trim()[0] ?? fallback).toUpperCase();
}

function toneFor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tones[h % tones.length]!;
}

export function Avatar({
  name,
  seed,
  size = 36,
  src,
  tone,
  className,
}: {
  name: string | null;
  seed?: string;
  size?: number;
  src?: string | null;
  /** Override the seeded colour, e.g. "bg-[#C7DCEE] text-primary". */
  tone?: string;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (src) {
    // Signed, short-lived URLs — plain img keeps it simple.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className={clsx("rounded-full object-cover shrink-0", className)} />;
  }
  return (
    <div
      aria-hidden
      style={style}
      className={clsx("rounded-full flex items-center justify-center font-bold shrink-0", tone ?? toneFor(seed ?? name ?? "?"), className)}
    >
      {initialOf(name)}
    </div>
  );
}
