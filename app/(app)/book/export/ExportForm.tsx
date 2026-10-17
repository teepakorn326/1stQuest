"use client";
import { useState } from "react";
import clsx from "clsx";
import { ButtonLink } from "@/components/ui/Button";

export function ExportForm({ circleId }: { circleId: string }) {
  const [format, setFormat] = useState<"pdf" | "slideshow">("pdf");
  const [order, setOrder] = useState<"category" | "date">("date");
  const [qr, setQr] = useState(true);
  const pdfHref = `/api/v1/circles/${circleId}/book/pdf?${new URLSearchParams({ order, qr: qr ? "1" : "0" })}`;
  const showHref = `/slideshow?${new URLSearchParams({ order })}`;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5 px-5 pt-2 pb-5">
        <div aria-hidden className="flex justify-center rounded-[18px] bg-tint py-5">
          <div className="flex h-[150px] w-[130px] flex-col gap-2 rounded-l-lg bg-surface p-3 shadow-[0_4px_12px_rgba(28,43,58,0.12)]">
            <div className="h-[78px] rounded bg-[#FFD497]" />
            <div className="h-1.5 w-4/5 rounded bg-ink" />
            <div className="h-[5px] w-[95%] rounded bg-[#EED8B5]" />
            <div className="h-[5px] w-[70%] rounded bg-[#EED8B5]" />
          </div>
          <div className="grid h-[150px] w-[130px] grid-cols-2 gap-1.5 rounded-r-lg border-l border-[#F6EBDA] bg-surface p-3 shadow-[0_4px_12px_rgba(28,43,58,0.12)]">
            <div className="rounded bg-[#FFE3B8]" />
            <div className="rounded bg-[#FFDFAE]" />
            <div className="rounded bg-[#FFEACC]" />
            <div className="rounded bg-[#FFD497]" />
          </div>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2.5 p-0 text-base font-bold">Make it as</legend>
          {(
            [
              ["pdf", "Photo book", "PDF, ready to print"],
              ["slideshow", "Slideshow", "For a gathering or service"],
            ] as const
          ).map(([v, label, hint]) => (
            <label
              key={v}
              className={clsx(
                "flex min-h-14 items-center gap-3 rounded-[14px] border-[1.5px] bg-surface px-3.5 text-base",
                format === v ? "border-primary" : "border-field",
              )}
            >
              <input type="radio" name="format" checked={format === v} onChange={() => setFormat(v)} className="h-5 w-5 accent-primary" />
              <span className="flex flex-col">
                <b>{label}</b>
                <span className="text-sm text-ink-3">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-base font-bold">Order the pages</legend>
          <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-tint p-1">
            {(
              [
                ["category", "By category"],
                ["date", "By date"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={order === v}
                onClick={() => setOrder(v)}
                className={clsx("h-11 rounded-[11px] text-[15px]", order === v ? "bg-surface font-bold text-ink shadow-[0_1px_2px_rgba(28,43,58,0.12)]" : "text-ink-2")}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {format === "pdf" && (
          <label className="flex min-h-12 items-center gap-3 text-base">
            <input type="checkbox" checked={qr} onChange={(e) => setQr(e.target.checked)} className="h-[22px] w-[22px] accent-primary" />
            Add QR codes for voice notes and videos
          </label>
        )}
        {format === "pdf" && qr && (
          <p className="m-0 -mt-3 text-sm text-ink-3">Scanning a code opens it in 1stQuest for people in the circle.</p>
        )}
      </div>
      <div className="sticky bottom-[76px] border-t border-line bg-bg px-5 pt-3 pb-4">
        {format === "pdf" ? (
          <a
            href={pdfHref}
            download
            className="flex min-h-[52px] w-full items-center justify-center rounded-[14px] bg-cta text-[17px] font-bold text-cta-ink no-underline hover:bg-cta-hover hover:text-cta-ink"
            data-testid="create-pdf"
          >
            Create PDF
          </a>
        ) : (
          <ButtonLink href={showHref} className="w-full">
            Start the slideshow
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
