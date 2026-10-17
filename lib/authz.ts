// Pure authorization rules. Callers load the rows; these functions decide.
import type { CircleRow, Role, Visibility } from "@/lib/db/types";

export type Viewer = { userId: string; role: Role | null };

type WishLike = { author_id: string; visibility: Visibility };

/**
 * Private: author only. Chosen: author + chosen viewers. Circle: every member (doctors included —
 * doctors see what the owner has shared with the circle, nothing more).
 */
export function canSeeWish(viewer: Viewer, wish: WishLike, chosenViewerIds: readonly string[] = []): boolean {
  if (!viewer.role) return false;
  if (wish.author_id === viewer.userId) return true;
  switch (wish.visibility) {
    case "private":
      return false;
    case "chosen":
      return chosenViewerIds.includes(viewer.userId);
    case "circle":
      return true;
  }
}

/** Quests on a wish you can see, that aren't locked/done and aren't someone else's. */
export function canClaimQuest(
  viewer: Viewer,
  wish: WishLike,
  quest: { status: "open" | "in_progress" | "done" | "locked"; claimed_by_user_id: string | null },
  chosenViewerIds: readonly string[] = [],
): boolean {
  if (!canSeeWish(viewer, wish, chosenViewerIds)) return false;
  if (wish.visibility === "private") return false;
  if (quest.status !== "open") return false;
  return quest.claimed_by_user_id === null || quest.claimed_by_user_id === viewer.userId;
}

/** Circle details (name, photo, mobility) and invites: owner and family. Doctors are read-mostly. */
export function canEditCircle(viewer: Viewer): boolean {
  return viewer.role === "owner" || viewer.role === "family";
}

/** Memorial mode switch and undo: owner only; undo allowed for 30 days after the switch. */
export function canSwitchMode(viewer: Viewer, circle: Pick<CircleRow, "mode" | "mode_changed_at">, now = new Date()): boolean {
  if (viewer.role !== "owner") return false;
  if (circle.mode === "active") return true;
  if (!circle.mode_changed_at) return true;
  const UNDO_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  return now.getTime() - circle.mode_changed_at.getTime() <= UNDO_WINDOW_MS;
}

export function canInvite(viewer: Viewer): boolean {
  return canEditCircle(viewer);
}

/** A card follows its wish's visibility; cards with no wish (shared memories) are for the whole circle. */
export function canSeeCard(
  viewer: Viewer,
  card: { wish_id: string | null; wish_author_id: string | null; wish_visibility: Visibility | null },
  chosenViewerIds: readonly string[] = [],
): boolean {
  if (!viewer.role) return false;
  if (!card.wish_id || !card.wish_author_id || !card.wish_visibility) return true;
  return canSeeWish(viewer, { author_id: card.wish_author_id, visibility: card.wish_visibility }, chosenViewerIds);
}

export const MEMORIAL_UNDO_DAYS = 30;

/** Last moment the owner can undo memorial mode, or null when not in memorial mode. */
export function memorialUndoUntil(circle: Pick<CircleRow, "mode" | "mode_changed_at">): Date | null {
  if (circle.mode !== "memorial" || !circle.mode_changed_at) return null;
  return new Date(circle.mode_changed_at.getTime() + MEMORIAL_UNDO_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Posting (wishes, plans, Talk it through, cards, memories, photos, voice notes, videos) is the
 * owner's. Everyone else in the circle reads, comments and takes quests.
 */
export function canPost(viewer: Viewer): boolean {
  return viewer.role === "owner";
}
export const POST_FORBIDDEN = "Only the circle’s owner can post. You can leave a message or take a quest.";
