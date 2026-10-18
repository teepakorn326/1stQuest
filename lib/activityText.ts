import type { ActivityItem } from "@/lib/db/queries/activity";

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Verb plus the thing acted on (rendered bold), e.g. { verb: "finished", object: "Find a beach" }. */
export function activityParts(a: Pick<ActivityItem, "type" | "payload">): { verb: string; object: string | null } {
  const p = a.payload ?? {};
  switch (a.type) {
    case "circle_created":
      return { verb: "started the circle", object: null };
    case "member_joined":
      return { verb: p.role === "caretaker" ? "joined as a caretaker" : "joined the circle", object: null };
    case "mobility_updated":
      return { verb: "updated how things are getting around", object: null };
    case "wish_added":
      return { verb: "added a new wish", object: str(p.text) };
    case "plan_generated":
      return { verb: "made a plan for", object: str(p.wish) };
    case "quest_claimed":
      return { verb: "took", object: str(p.title) };
    case "quest_done":
      return { verb: "finished", object: str(p.title) };
    case "photos_added":
      return { verb: `added ${typeof p.count === "number" && p.count > 1 ? `${p.count} photos` : "a photo"} to`, object: str(p.wish) };
    case "recording_added":
      return { verb: p.kind === "video" ? "added a video to" : "added a voice note to", object: str(p.wish) };
    case "card_created":
      return { verb: "made a new card", object: str(p.title) };
    case "card_message":
      return { verb: "left a message on", object: str(p.title) };
    case "card_levelled_up":
      return { verb: "helped a card shine:", object: str(p.title) };
    default:
      return { verb: "did something in the circle", object: null };
  }
}

/** Plain-language line for a feed item. Actor name is rendered separately in bold. */
export function describeActivity(a: Pick<ActivityItem, "type" | "payload">): string {
  const { verb, object } = activityParts(a);
  return object ? `${verb} “${object}”` : verb;
}

/** The wish an item belongs to, when it's not already the object. */
export function activityContext(a: Pick<ActivityItem, "type" | "payload">): string | null {
  if (["plan_generated", "photos_added", "recording_added", "wish_added"].includes(a.type)) return null;
  return str((a.payload ?? {}).wish);
}

export function timeAgo(date: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export const MOBILITY_LABEL = {
  walks_alone: "Walks on their own",
  short_walks_with_help: "Short walks with help",
  wheelchair: "Uses a wheelchair",
  mostly_resting: "Mostly resting",
} as const;

export const CATEGORY_LABEL = {
  places: "Places",
  tastes: "Tastes",
  people: "People",
  music: "Music",
  nature: "Nature",
  legacy: "Legacy",
} as const;

export const VISIBILITY_LABEL = {
  circle: "Everyone in the circle",
  chosen: "Only people I choose",
  private: "Just me for now",
} as const;
