import type { Hemisphere } from "@/lib/db/types";

export type Season = "summer" | "autumn" | "winter" | "spring";

const SOUTH: Season[] = ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"];
const FLIP: Record<Season, Season> = { summer: "winter", winter: "summer", autumn: "spring", spring: "autumn" };

/** Meteorological seasons by month (Dec–Feb is summer in the south, winter in the north). */
export function seasonOf(date: Date, hemisphere: Hemisphere): Season {
  const s = SOUTH[date.getUTCMonth()]!;
  return hemisphere === "south" ? s : FLIP[s];
}

/** Timeline groups: "October · spring", plus the year when it isn't this year. Newest first. */
export function groupByMonthSeason<T extends { happened_on: Date }>(items: T[], hemisphere: Hemisphere, now = new Date()) {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const d = item.happened_on;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const month = d.toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" });
    const year = d.getUTCFullYear() === now.getUTCFullYear() ? "" : ` ${d.getUTCFullYear()}`;
    const label = `${month}${year} · ${seasonOf(d, hemisphere)}`;
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label, items: [item] });
  }
  return groups;
}
