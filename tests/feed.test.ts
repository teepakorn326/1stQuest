import { describe, expect, it } from "vitest";
import { groupByDay } from "@/lib/feed";

describe("groupByDay", () => {
  it("groups by the viewer's local day, then by month", () => {
    const now = new Date(2026, 9, 17, 9, 0); // 17 Oct 2026, 9am local
    const items = [
      { id: 1, created_at: new Date(2026, 9, 17, 8, 0) },
      { id: 2, created_at: new Date(2026, 9, 17, 0, 5) },
      { id: 3, created_at: new Date(2026, 9, 16, 23, 55) }, // just before midnight → Yesterday
      { id: 4, created_at: new Date(2026, 9, 2, 12, 0) },
      { id: 5, created_at: new Date(2025, 11, 25, 12, 0) },
    ];
    const g = groupByDay(items, now);
    expect(g.map((x) => [x.label, x.items.map((i) => i.id)])).toEqual([
      ["Today", [1, 2]],
      ["Yesterday", [3]],
      ["October", [4]],
      ["December 2025", [5]],
    ]);
  });

  it("accepts ISO strings", () => {
    const now = new Date();
    expect(groupByDay([{ created_at: now.toISOString() }], now)[0]?.label).toBe("Today");
  });
});
