import "server-only";
import { sql } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import type { InviteRole, InviteRow, Role } from "@/lib/db/types";

export const INVITE_TTL_DAYS = 7;

export async function createInvite(input: {
  circleId: string;
  role: InviteRole;
  token: string;
  createdBy: string;
}): Promise<InviteRow> {
  const [row] = await sql<InviteRow[]>`
    insert into invites (circle_id, role, token, created_by, expires_at)
    values (${input.circleId}, ${input.role}, ${input.token}, ${input.createdBy},
            now() + make_interval(days => ${INVITE_TTL_DAYS}))
    returning *`;
  return row!;
}

/** Most recent unexpired invite for a circle+role, so the invite page shows a stable QR. */
export async function findActiveInvite(circleId: string, role: InviteRole): Promise<InviteRow | null> {
  const [row] = await sql<InviteRow[]>`
    select * from invites
    where circle_id = ${circleId} and role = ${role} and expires_at > now() + interval '1 day'
    order by created_at desc limit 1`;
  return row ?? null;
}

export type InvitePreview = { circle_id: string; role: InviteRole; patient_name: string; expired: boolean };

export async function findInvitePreview(token: string): Promise<InvitePreview | null> {
  const [row] = await sql<InvitePreview[]>`
    select i.circle_id, i.role, c.patient_name, (i.expires_at <= now()) as expired
    from invites i join circles c on c.id = i.circle_id
    where i.token = ${token}`;
  return row ?? null;
}

export type AcceptResult =
  | { ok: true; circleId: string; role: Role; alreadyMember: boolean }
  | { ok: false; reason: "not_found" | "expired" };

/** Joins the user to the invite's circle. Idempotent: existing members keep their role. */
export async function acceptInvite(token: string, userId: string): Promise<AcceptResult> {
  return sql.begin(async (tx) => {
    const [invite] = await tx<InviteRow[]>`select * from invites where token = ${token} for update`;
    if (!invite) return { ok: false, reason: "not_found" } as const;
    const [existing] = await tx<{ role: Role }[]>`
      select role from memberships where circle_id = ${invite.circle_id} and user_id = ${userId}`;
    if (existing) return { ok: true, circleId: invite.circle_id, role: existing.role, alreadyMember: true } as const;
    if (invite.expires_at <= new Date()) return { ok: false, reason: "expired" } as const;

    await tx`insert into memberships (circle_id, user_id, role) values (${invite.circle_id}, ${userId}, ${invite.role})`;
    await tx`update invites set used_by_user_id = ${userId} where id = ${invite.id} and used_by_user_id is null`;
    await insertActivity(tx, {
      circleId: invite.circle_id,
      actorId: userId,
      type: "member_joined",
      refId: userId,
      payload: { role: invite.role },
    });
    return { ok: true, circleId: invite.circle_id, role: invite.role, alreadyMember: false } as const;
  });
}
