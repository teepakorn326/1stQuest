// Memorial handover rules. Pure: callers load rows, this decides.
// The owner and caretakers switch the book to a memorial album themselves. If none of them can, a
// trusted viewer they named can, or two viewers together, after a 7-day hold any of them can cancel.
// Whoever completes it becomes a caretaker.
import { manages, type Viewer } from "@/lib/authz";
import type { CircleMode } from "@/lib/db/types";

export const MEMORIAL_HOLD_DAYS = 7;

type Circle = { mode: CircleMode; trusted_user_id: string | null };
export type OpenRequest = { requested_by: string; confirmed_by: string | null; takes_effect_at: Date | null };

const isViewer = (v: Viewer) => v.role === "viewer" || v.role === "health";

/** The owner or a caretaker names (or clears) the trusted person; only a viewer can be named. */
export function canNameTrusted(viewer: Viewer, candidateRole: string | null): boolean {
  return manages(viewer.role) && (candidateRole === null || candidateRole === "viewer" || candidateRole === "health");
}

/** The trusted person switches straight away (and becomes a caretaker). */
export function canTrustedSwitch(viewer: Viewer, circle: Circle): boolean {
  return circle.mode === "active" && isViewer(viewer) && circle.trusted_user_id === viewer.userId;
}

export function canAsk(viewer: Viewer, circle: Circle, open: OpenRequest | null): boolean {
  return circle.mode === "active" && isViewer(viewer) && !open;
}

/** A second viewer (not the one who asked) confirms; the switch then waits 7 days. */
export function canConfirm(viewer: Viewer, circle: Circle, open: OpenRequest | null): boolean {
  return circle.mode === "active" && isViewer(viewer) && !!open && !open.confirmed_by && open.requested_by !== viewer.userId;
}

/** The owner or a caretaker cancels ("I'm still here"); the two viewers can withdraw. */
export function canCancel(viewer: Viewer, open: OpenRequest | null): boolean {
  if (!open) return false;
  return manages(viewer.role) || open.requested_by === viewer.userId || open.confirmed_by === viewer.userId;
}

export function takesEffectAt(confirmedAt: Date): Date {
  return new Date(confirmedAt.getTime() + MEMORIAL_HOLD_DAYS * 86_400_000);
}

export function isDue(open: OpenRequest | null, now = new Date()): boolean {
  return !!open?.takes_effect_at && open.takes_effect_at.getTime() <= now.getTime();
}
