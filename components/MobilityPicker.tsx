"use client";
import clsx from "clsx";
import { MOBILITY_LABEL } from "@/lib/activityText";
import { MOBILITIES, type Mobility } from "@/lib/db/types";

export function MobilityPicker({ value, onChange }: { value: Mobility; onChange: (m: Mobility) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Getting around today">
      {MOBILITIES.map((m) => {
        const on = m === value;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m)}
            className={clsx(
              "h-11 rounded-[22px] border-[1.5px] px-3.5 text-[15px]",
              on ? "border-primary bg-cta font-bold text-cta-ink" : "border-field bg-surface text-ink",
            )}
          >
            {MOBILITY_LABEL[m]}
          </button>
        );
      })}
    </div>
  );
}
