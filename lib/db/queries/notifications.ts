import "server-only";
import { sql, type Tx } from "@/lib/db/client";
import type { NotificationRow, Role } from "@/lib/db/types";

export type NotifyKind = "wish" | "plan" | "card" | "memory" | "media" | "memorial_asked" | "memorial_confirmed" | "memorial_switched" | "memorial_cancelled";

export type SmsRecipient = { user_id: string; phone: string };

/**
 * When the owner posts: one notification per other member who may see it (same visibility rule
 * as the feed; private wishes notify no one). Runs inside the posting transaction and returns the
 * opted-in phone numbers to text after commit.
 */
export async function notifyCircle(
  tx: Tx,
  n: { circleId: string; actorId: string; wishId: string | null; kind: NotifyKind; title: string; url: string },
): Promise<SmsRecipient[]> {
  const rows = await tx<{ user_id: string; phone: string | null; sms_opt_in: boolean }[]>`
    with recipients as (
      select m.user_id from memberships m
      left join wishes w on w.id = ${n.wishId}::uuid
      where m.circle_id = ${n.circleId} and m.user_id <> ${n.actorId}
        and (
          ${n.wishId}::uuid is null
          or w.author_id = m.user_id
          or w.visibility = 'circle'
          or (w.visibility = 'chosen' and exists (select 1 from wish_viewers v where v.wish_id = w.id and v.user_id = m.user_id))
        )
    ), inserted as (
      insert into notifications (user_id, circle_id, actor_id, kind, title, url)
      select user_id, ${n.circleId}, ${n.actorId}, ${n.kind}, ${n.title.slice(0, 200)}, ${n.url}
      from recipients
      returning user_id
    )
    select u.id as user_id, u.phone, u.sms_opt_in from inserted i join users u on u.id = i.user_id`;
  return rows.filter((r) => r.sms_opt_in && r.phone).map((r) => ({ user_id: r.user_id, phone: r.phone! }));
}

/**
 * Notifies chosen members of a circle (all but the actor, optionally only some roles or users).
 * Returns the phone numbers to text: opted-in members, plus `alwaysText` (the owner and caretakers,
 * for a memorial request they may need to cancel) whenever they have a number.
 */
export async function notifyMembers(
  tx: Tx,
  n: { circleId: string; actorId: string; kind: NotifyKind; title: string; url: string; roles?: Role[]; userIds?: string[]; alwaysText?: string[] },
): Promise<SmsRecipient[]> {
  const rows = await tx<{ user_id: string; phone: string | null; sms_opt_in: boolean }[]>`
    with recipients as (
      select m.user_id from memberships m
      where m.circle_id = ${n.circleId} and m.user_id <> ${n.actorId}
        ${n.roles ? tx`and m.role in ${tx(n.roles)}` : tx``}
        ${n.userIds ? tx`and m.user_id in ${tx(n.userIds.length ? n.userIds : ["00000000-0000-0000-0000-000000000000"])}` : tx``}
    ), inserted as (
      insert into notifications (user_id, circle_id, actor_id, kind, title, url)
      select user_id, ${n.circleId}, ${n.actorId}, ${n.kind}, ${n.title.slice(0, 200)}, ${n.url}
      from recipients
      returning user_id
    )
    select u.id as user_id, u.phone, u.sms_opt_in from inserted i join users u on u.id = i.user_id`;
  return rows.filter((r) => r.phone && (r.sms_opt_in || n.alwaysText?.includes(r.user_id))).map((r) => ({ user_id: r.user_id, phone: r.phone! }));
}

export type NotificationItem = NotificationRow & { actor_name: string | null; patient_name: string };

export async function listNotifications(userId: string, limit = 50): Promise<NotificationItem[]> {
  return sql<NotificationItem[]>`
    select n.*, u.name as actor_name, c.patient_name
    from notifications n
    join circles c on c.id = n.circle_id
    join memberships m on m.circle_id = n.circle_id and m.user_id = n.user_id
    left join users u on u.id = n.actor_id
    where n.user_id = ${userId}
    order by n.created_at desc
    limit ${limit}`;
}

export async function countUnread(userId: string): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from notifications n
    join memberships m on m.circle_id = n.circle_id and m.user_id = n.user_id
    where n.user_id = ${userId} and n.read_at is null`;
  return row?.n ?? 0;
}

export async function markAllRead(userId: string): Promise<void> {
  await sql`update notifications set read_at = now() where user_id = ${userId} and read_at is null`;
}

export async function latestUnread(userId: string): Promise<NotificationItem | null> {
  const [row] = await sql<NotificationItem[]>`
    select n.*, u.name as actor_name, c.patient_name
    from notifications n join circles c on c.id = n.circle_id
    left join users u on u.id = n.actor_id
    where n.user_id = ${userId} and n.read_at is null
    order by n.created_at desc limit 1`;
  return row ?? null;
}

export async function setPhone(userId: string, phone: string | null, optIn: boolean): Promise<void> {
  await sql`update users set phone = ${phone}, sms_opt_in = ${phone ? optIn : false} where id = ${userId}`;
}
