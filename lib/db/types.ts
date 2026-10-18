// Hand-written row types. Keep in sync with db/migrations/*.sql.

export type Mobility = "walks_alone" | "short_walks_with_help" | "wheelchair" | "mostly_resting";
/**
 * owner: the person the circle is for. caretaker: sets it up, posts, manages people.
 * viewer: reads, comments, takes quests. health: a health professional, same as a viewer.
 */
export type Role = "owner" | "caretaker" | "viewer" | "health";
export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", caretaker: "Caretaker", viewer: "Viewer", health: "Health professional" };
export type InviteRole = Exclude<Role, "owner">;
export type CircleMode = "active" | "memorial";
export type Hemisphere = "north" | "south";
export type Category = "places" | "tastes" | "people" | "music" | "nature" | "legacy";
export type Visibility = "circle" | "chosen" | "private";
export type QuestStatus = "open" | "in_progress" | "done" | "locked";
export type MediaKind = "photo" | "voice" | "video";

export const MOBILITIES: readonly Mobility[] = ["walks_alone", "short_walks_with_help", "wheelchair", "mostly_resting"];
export const CATEGORIES: readonly Category[] = ["places", "tastes", "people", "music", "nature", "legacy"];

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  phone: string | null;
  sms_opt_in: boolean;
  created_at: Date;
}

export interface SessionRow {
  id: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

export interface MagicLinkRow {
  token_hash: string;
  email: string;
  next_path: string | null;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface CircleRow {
  id: string;
  patient_name: string;
  patient_photo_path: string | null;
  mobility: Mobility;
  mobility_notes: string | null;
  set_up_by_patient: boolean;
  hemisphere: Hemisphere;
  mode: CircleMode;
  mode_changed_at: Date | null;
  /** Family member the owner named to switch the book to a memorial album if they can't. */
  trusted_user_id: string | null;
  /** The circle's one link / QR code; it only lets in people a caretaker added. */
  join_token: string;
  /** Headstone on the "In loving memory" home. */
  birth_year: number | null;
  death_year: number | null;
  epitaph: string | null;
  created_at: Date;
}

export interface MembershipRow {
  circle_id: string;
  user_id: string;
  role: Role;
  joined_at: Date;
}

export interface InviteRow {
  id: string;
  circle_id: string;
  role: InviteRole;
  token: string;
  created_by: string;
  expires_at: Date;
  used_by_user_id: string | null;
  created_at: Date;
}

export interface WishRow {
  id: string;
  circle_id: string;
  author_id: string;
  text: string;
  category: Category;
  visibility: Visibility;
  created_at: Date;
}

export interface WishViewerRow {
  wish_id: string;
  user_id: string;
}

export interface PlanRow {
  id: string;
  wish_id: string;
  text: string;
  based_on_mobility: Mobility;
  needs_care_team: boolean;
  care_team_note: string | null;
  generated_at: Date;
}

export interface QuestRow {
  id: string;
  wish_id: string;
  plan_id: string | null;
  title: string;
  status: QuestStatus;
  needs_care_team: boolean;
  claimed_by_user_id: string | null;
  position: number;
  updated_at: Date;
}

export interface CardRow {
  id: string;
  wish_id: string | null;
  circle_id: string;
  author_id: string | null;
  category: Category;
  title: string;
  body: string;
  story: string | null;
  place: string | null;
  happened_on: Date;
  cover_media_id: string | null;
  level: number;
  share_token: string | null;
  shared_at: Date | null;
  created_at: Date;
}

export interface MediaRow {
  id: string;
  circle_id: string;
  card_id: string | null;
  uploader_id: string | null;
  kind: MediaKind;
  path: string;
  mime_type: string;
  bytes: number;
  duration_sec: number | null;
  created_at: Date;
}

export interface CardMessageRow {
  id: string;
  card_id: string;
  author_id: string;
  text: string;
  created_at: Date;
}

export interface CardLikeRow {
  card_id: string;
  user_id: string;
  created_at: Date;
}

export interface ActivityRow {
  id: string;
  circle_id: string;
  actor_id: string | null;
  wish_id: string | null;
  type: string;
  ref_id: string | null;
  payload: Record<string, unknown>;
  created_at: Date;
}

export interface ConversationRow {
  id: string;
  circle_id: string;
  user_id: string;
  created_at: Date;
}

export interface ConversationMessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  suggestion: { text: string; category: Category } | null;
  created_at: Date;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  circle_id: string;
  actor_id: string | null;
  kind: string;
  title: string;
  url: string;
  read_at: Date | null;
  created_at: Date;
}
