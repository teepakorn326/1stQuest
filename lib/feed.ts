// Feed grouping in the viewer's own timezone: Today / Yesterday / earlier by month.

export type Grouped<T> = { label: string; items: T[] }[];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function groupByDay<T extends { created_at: string | Date }>(items: T[], now = new Date()): Grouped<T> {
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const yesterday = dayKey(y);
  const groups: Grouped<T> = [];
  for (const item of items) {
    const d = new Date(item.created_at);
    const key = dayKey(d);
    const label =
      key === today
        ? "Today"
        : key === yesterday
          ? "Yesterday"
          : d.toLocaleDateString("en-AU", { month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
