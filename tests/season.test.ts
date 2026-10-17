import { describe, expect, it } from "vitest";
import { groupByMonthSeason, seasonOf } from "@/lib/season";

const d = (y: number, m: number, day = 15) => new Date(Date.UTC(y, m - 1, day));

describe("seasonOf", () => {
  it("south: Dec–Feb summer, Mar–May autumn, Jun–Aug winter, Sep–Nov spring", () => {
    expect([1, 2, 12].map((m) => seasonOf(d(2026, m), "south"))).toEqual(["summer", "summer", "summer"]);
    expect([3, 4, 5].map((m) => seasonOf(d(2026, m), "south"))).toEqual(["autumn", "autumn", "autumn"]);
    expect([6, 7, 8].map((m) => seasonOf(d(2026, m), "south"))).toEqual(["winter", "winter", "winter"]);
    expect([9, 10, 11].map((m) => seasonOf(d(2026, m), "south"))).toEqual(["spring", "spring", "spring"]);
  });

  it("north is the opposite", () => {
    expect(seasonOf(d(2026, 1), "north")).toBe("winter");
    expect(seasonOf(d(2026, 4), "north")).toBe("spring");
    expect(seasonOf(d(2026, 7), "north")).toBe("summer");
    expect(seasonOf(d(2026, 10), "north")).toBe("autumn");
  });
});

describe("groupByMonthSeason", () => {
  it("groups newest-first cards by month with the season, adding the year when it differs", () => {
    const now = d(2026, 10, 17);
    const items = [
      { id: "a", happened_on: d(2026, 10, 11) },
      { id: "b", happened_on: d(2026, 10, 5) },
      { id: "c", happened_on: d(2026, 9, 21) },
      { id: "e", happened_on: d(2025, 12, 25) },
    ];
    expect(groupByMonthSeason(items, "south", now).map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["October · spring", ["a", "b"]],
      ["September · spring", ["c"]],
      ["December 2025 · summer", ["e"]],
    ]);
    expect(groupByMonthSeason(items, "north", now)[0]!.label).toBe("October · autumn");
  });
});
