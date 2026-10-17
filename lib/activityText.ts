import type { ActivityItem } from "@/lib/db/queries/activity";

const quote = (s: unknown) => (typeof s === "string" && s ? `“${s}”` : "");

/** Plain-language line for a feed item. Actor name is rendered separately in bold. */
export function describeActivity(a: Pick<ActivityItem, "type" | "payload">): string {
  const p = a.payload ?? {};
  switch (a.type) {
    case "circle_created":
      return "started the circle";
    case "member_joined":
      return p.role === "doctor" ? "joined as care team" : "joined the circle";
    case "mobility_updated":
      return "updated how things are getting around";
    case "wish_added":
      return `added a new wish ${quote(p.text)}`.trim();
    case "plan_generated":
      return `made a plan for ${quote(p.wish)}`.trim();
    case "quest_claimed":
      return `took ${quote(p.title)}`.trim();
    case "quest_done":
      return `finished ${quote(p.title)}`.trim();
    case "photos_added":
      return `added ${typeof p.count === "number" && p.count > 1 ? `${p.count} photos` : "a photo"} to ${quote(p.wish)}`.trim();
    case "card_created":
      return `made a new card ${quote(p.title)}`.trim();
    case "card_message":
      return `left a message on ${quote(p.title)}`.trim();
    case "card_levelled_up":
      return `helped ${quote(p.title)} shine`.trim();
    default:
      return "did something in the circle";
  }
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
