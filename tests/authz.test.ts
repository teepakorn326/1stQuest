import { describe, expect, it } from "vitest";
import { canClaimQuest, canEditCircle, canSeeWish, canSwitchMode, type Viewer } from "@/lib/authz";
import type { Role, Visibility } from "@/lib/db/types";

const AUTHOR = "u-author";
const OTHER = "u-other";
const CHOSEN = "u-chosen";
const wish = (visibility: Visibility) => ({ author_id: AUTHOR, visibility });
const v = (userId: string, role: Role | null): Viewer => ({ userId, role });

describe("canSeeWish", () => {
  const roles: Role[] = ["owner", "family", "doctor"];

  it.each(roles)("circle wishes are visible to every %s", (role) => {
    expect(canSeeWish(v(OTHER, role), wish("circle"))).toBe(true);
  });

  it.each(roles)("private wishes are hidden from a non-author %s", (role) => {
    expect(canSeeWish(v(OTHER, role), wish("private"))).toBe(false);
  });

  it("private wishes are visible to their author", () => {
    expect(canSeeWish(v(AUTHOR, "family"), wish("private"))).toBe(true);
  });

  it.each(roles)("chosen wishes: visible to a chosen %s, hidden from others", (role) => {
    expect(canSeeWish(v(CHOSEN, role), wish("chosen"), [CHOSEN])).toBe(true);
    expect(canSeeWish(v(OTHER, role), wish("chosen"), [CHOSEN])).toBe(false);
  });

  it("non-members never see anything", () => {
    expect(canSeeWish(v(OTHER, null), wish("circle"))).toBe(false);
    expect(canSeeWish(v(AUTHOR, null), wish("private"))).toBe(false);
  });
});

describe("canClaimQuest", () => {
  const open = { status: "open" as const, claimed_by_user_id: null };

  it("members can claim open quests on circle wishes", () => {
    expect(canClaimQuest(v(OTHER, "family"), wish("circle"), open)).toBe(true);
    expect(canClaimQuest(v(OTHER, "doctor"), wish("circle"), open)).toBe(true);
  });

  it("nobody can claim on a private wish, even the author", () => {
    expect(canClaimQuest(v(AUTHOR, "owner"), wish("private"), open)).toBe(false);
  });

  it("locked, in-progress and done quests can't be claimed", () => {
    for (const status of ["locked", "in_progress", "done"] as const) {
      expect(canClaimQuest(v(OTHER, "family"), wish("circle"), { status, claimed_by_user_id: null })).toBe(false);
    }
  });

  it("chosen wishes: only chosen viewers can claim", () => {
    expect(canClaimQuest(v(CHOSEN, "family"), wish("chosen"), open, [CHOSEN])).toBe(true);
    expect(canClaimQuest(v(OTHER, "family"), wish("chosen"), open, [CHOSEN])).toBe(false);
  });
});

describe("canEditCircle", () => {
  it("owner and family can, doctors and non-members can't", () => {
    expect(canEditCircle(v(OTHER, "owner"))).toBe(true);
    expect(canEditCircle(v(OTHER, "family"))).toBe(true);
    expect(canEditCircle(v(OTHER, "doctor"))).toBe(false);
    expect(canEditCircle(v(OTHER, null))).toBe(false);
  });
});

describe("canSwitchMode", () => {
  const now = new Date("2026-10-17T00:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  it("only the owner can switch to memorial", () => {
    expect(canSwitchMode(v(OTHER, "owner"), { mode: "active", mode_changed_at: null }, now)).toBe(true);
    expect(canSwitchMode(v(OTHER, "family"), { mode: "active", mode_changed_at: null }, now)).toBe(false);
    expect(canSwitchMode(v(OTHER, "doctor"), { mode: "active", mode_changed_at: null }, now)).toBe(false);
  });

  it("owner can undo within 30 days, not after", () => {
    expect(canSwitchMode(v(OTHER, "owner"), { mode: "memorial", mode_changed_at: daysAgo(29) }, now)).toBe(true);
    expect(canSwitchMode(v(OTHER, "owner"), { mode: "memorial", mode_changed_at: daysAgo(31) }, now)).toBe(false);
  });
});
