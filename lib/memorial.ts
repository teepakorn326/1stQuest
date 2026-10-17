// Memorial handover rules. Pure: callers load rows, this decides.
// If the owner can't switch the book to a memorial album, a trusted person they named can, or two
// family members can together, after a 7-day hold the owner can cancel. Care team members never can.
import type { Viewer } from "@/lib/authz";
import type { CircleMode } from "@/lib/db/types";

export const MEMORIAL_HOLD_DAYS = 7;

type Circle = { mode: CircleMode; trusted_user_id: string | null };
export type OpenRequest = { requested_by: string; confirmed_by: string | null; takes_effect_at: Date | null };

const isFamily = (v: Viewer) => v.role === "family";

/** Only the owner names (or clears) the trusted person, and only a family member can be named. */
export function canNameTrusted(viewer: Viewer, candidateRole: string | null): boolean {
  return viewer.role === "owner" && (candidateRole === null || candidateRole === "family");
}

/** The trusted person switches straight away (and becomes the owner). */
export function canTrustedSwitch(viewer: Viewer, circle: Circle): boolean {
  return circle.mode === "active" && isFamily(viewer) && circle.trusted_user_id === viewer.userId;
}

export function canAsk(viewer: Viewer, circle: Circle, open: OpenRequest | null): boolean {
  return circle.mode === "active" && isFamily(viewer) && !open;
}

/** A second family member (not the one who asked) confirms; the switch then waits 7 days. */
export function canConfirm(viewer: Viewer, circle: Circle, open: OpenRequest | null): boolean {
  return circle.mode === "active" && isFamily(viewer) && !!open && !open.confirmed_by && open.requested_by !== viewer.userId;
}

/** The owner cancels ("I'm still here"); the two family members can withdraw. */
export function canCancel(viewer: Viewer, open: OpenRequest | null): boolean {
  if (!open) return false;
  return viewer.role === "owner" || open.requested_by === viewer.userId || open.confirmed_by === viewer.userId;
}

export function takesEffectAt(confirmedAt: Date): Date {
  return new Date(confirmedAt.getTime() + MEMORIAL_HOLD_DAYS * 86_400_000);
}

export function isDue(open: OpenRequest | null, now = new Date()): boolean {
  return !!open?.takes_effect_at && open.takes_effect_at.getTime() <= now.getTime();
}
