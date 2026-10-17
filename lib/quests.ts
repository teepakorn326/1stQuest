// Quest state machine. Pure: callers load rows, this decides; the DB update is conditional on
// the status we decided from, so two people tapping "I'll take this" at once can't both win.
import { canClaimQuest, type Viewer } from "@/lib/authz";
import type { QuestStatus, Visibility } from "@/lib/db/types";

export type QuestAction = "claim" | "release" | "done";

type Quest = { status: QuestStatus; claimed_by_user_id: string | null };
type Wish = { author_id: string; visibility: Visibility };

export type Transition =
  | { ok: true; status: QuestStatus; claimedBy: string | null }
  | { ok: false; reason: "locked" | "not_allowed" | "wrong_state" };

export function questTransition(
  action: QuestAction,
  quest: Quest,
  wish: Wish,
  viewer: Viewer,
  chosenViewerIds: readonly string[] = [],
): Transition {
  if (quest.status === "locked") return { ok: false, reason: "locked" };
  const mine = quest.claimed_by_user_id === viewer.userId;
  const owner = viewer.role === "owner";

  switch (action) {
    case "claim":
      if (quest.status !== "open") return { ok: false, reason: "wrong_state" };
      return canClaimQuest(viewer, wish, quest, chosenViewerIds)
        ? { ok: true, status: "in_progress", claimedBy: viewer.userId }
        : { ok: false, reason: "not_allowed" };
    case "release":
      if (quest.status !== "in_progress") return { ok: false, reason: "wrong_state" };
      return mine || owner ? { ok: true, status: "open", claimedBy: null } : { ok: false, reason: "not_allowed" };
    case "done":
      if (quest.status !== "in_progress") return { ok: false, reason: "wrong_state" };
      return mine || owner ? { ok: true, status: "done", claimedBy: quest.claimed_by_user_id } : { ok: false, reason: "not_allowed" };
  }
}

/** Status a quest takes when its wish's visibility changes (private wishes lock their quests). */
export function statusForVisibility(status: QuestStatus, visibility: Visibility): QuestStatus {
  if (visibility === "private" && status === "open") return "locked";
  if (visibility !== "private" && status === "locked") return "open";
  return status;
}
