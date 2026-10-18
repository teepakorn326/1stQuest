import { describe, expect, it } from "vitest";
import { questTransition, statusForVisibility } from "@/lib/quests";
import type { Viewer } from "@/lib/authz";

const ME = "me";
const OTHER = "other";
const circleWish = { author_id: OTHER, visibility: "circle" as const };
const v = (role: Viewer["role"], userId = ME): Viewer => ({ userId, role });

describe("questTransition", () => {
  it("claim: open → in_progress for a member", () => {
    expect(questTransition("claim", { status: "open", claimed_by_user_id: null }, circleWish, v("viewer"))).toEqual({
      ok: true,
      status: "in_progress",
      claimedBy: ME,
    });
  });

  it("claim fails unless open", () => {
    for (const status of ["in_progress", "done"] as const) {
      expect(questTransition("claim", { status, claimed_by_user_id: OTHER }, circleWish, v("viewer"))).toMatchObject({ ok: false, reason: "wrong_state" });
    }
  });

  it("locked quests reject every action", () => {
    for (const a of ["claim", "release", "done"] as const) {
      expect(questTransition(a, { status: "locked", claimed_by_user_id: null }, circleWish, v("owner"))).toMatchObject({ ok: false, reason: "locked" });
    }
  });

  it("can't claim on a private wish, even the author", () => {
    const priv = { author_id: ME, visibility: "private" as const };
    expect(questTransition("claim", { status: "open", claimed_by_user_id: null }, priv, v("owner"))).toMatchObject({ ok: false });
  });

  it("chosen wishes: only chosen viewers can claim", () => {
    const chosen = { author_id: OTHER, visibility: "chosen" as const };
    const open = { status: "open" as const, claimed_by_user_id: null };
    expect(questTransition("claim", open, chosen, v("viewer"), [ME]).ok).toBe(true);
    expect(questTransition("claim", open, chosen, v("viewer"), ["someone"]).ok).toBe(false);
  });

  it("done and release: the claimer or the owner, nobody else", () => {
    const mine = { status: "in_progress" as const, claimed_by_user_id: ME };
    const theirs = { status: "in_progress" as const, claimed_by_user_id: OTHER };
    expect(questTransition("done", mine, circleWish, v("viewer"))).toMatchObject({ ok: true, status: "done", claimedBy: ME });
    expect(questTransition("release", mine, circleWish, v("viewer"))).toMatchObject({ ok: true, status: "open", claimedBy: null });
    expect(questTransition("done", theirs, circleWish, v("viewer"))).toMatchObject({ ok: false, reason: "not_allowed" });
    expect(questTransition("done", theirs, circleWish, v("owner"))).toMatchObject({ ok: true, claimedBy: OTHER });
    expect(questTransition("done", { status: "open", claimed_by_user_id: null }, circleWish, v("owner"))).toMatchObject({ ok: false, reason: "wrong_state" });
  });
});

describe("statusForVisibility", () => {
  it("private locks open quests; sharing unlocks; others unchanged", () => {
    expect(statusForVisibility("open", "private")).toBe("locked");
    expect(statusForVisibility("locked", "circle")).toBe("open");
    expect(statusForVisibility("locked", "chosen")).toBe("open");
    expect(statusForVisibility("in_progress", "private")).toBe("in_progress");
    expect(statusForVisibility("done", "private")).toBe("done");
  });
});
