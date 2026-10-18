import "server-only";
import { sql, type Tx } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import type { InviteRole, UserRow } from "@/lib/db/types";

export type PersonInput = { name: string; email: string; phone: string | null };

export class PersonError extends Error {
  constructor(readonly reason: "phone_taken" | "already_member" | "is_you" | "not_found") {
    super(reason);
  }
}

/**
 * The account for this email, created if needed. A missing name or number is filled in; an
 * existing different number is left alone. A number already on someone else's account is refused.
 */
export async function upsertPerson(tx: Tx, p: PersonInput): Promise<UserRow> {
  const email = p.email.trim().toLowerCase();
  if (p.phone) {
    const [other] = await tx<{ id: string }[]>`select id from users where phone = ${p.phone} and email <> ${email}`;
    if (other) throw new PersonError("phone_taken");
  }
  const [row] = await tx<UserRow[]>`
    insert into users (email, name, phone) values (${email}, ${p.name.trim() || null}, ${p.phone})
    on conflict (email) do update set
      name = coalesce(users.name, excluded.name),
      phone = coalesce(users.phone, excluded.phone)
    returning *`;
  return row!;
}

/** A caretaker adds someone by name, email and (optionally) mobile number. They sign in with either. */
export async function addPerson(input: PersonInput & { circleId: string; actorId: string; role: InviteRole }): Promise<UserRow> {
  return sql.begin(async (tx) => {
    const user = await upsertPerson(tx, input);
    if (user.id === input.actorId) throw new PersonError("is_you");
    const added = await tx`
      insert into memberships (circle_id, user_id, role) values (${input.circleId}, ${user.id}, ${input.role})
      on conflict do nothing returning user_id`;
    if (!added.length) throw new PersonError("already_member");
    await insertActivity(tx, { circleId: input.circleId, actorId: user.id, type: "member_joined", refId: user.id, payload: { role: input.role } });
    return user;
  });
}

/** Takes someone out of the circle. The owner (the person the circle is for) can't be removed. */
export async function removePerson(circleId: string, userId: string): Promise<boolean> {
  const rows = await sql`delete from memberships where circle_id = ${circleId} and user_id = ${userId} and role <> 'owner' returning user_id`;
  if (rows.length) await sql`update circles set trusted_user_id = null where id = ${circleId} and trusted_user_id = ${userId}`;
  return rows.length > 0;
}

export type JoinTarget = { circle_id: string; patient_name: string };

/** The circle behind a join link: its own token, or an older per-role invite token. */
export async function findJoinTarget(token: string): Promise<JoinTarget | null> {
  const [row] = await sql<JoinTarget[]>`
    select id as circle_id, patient_name from circles where join_token = ${token}
    union all
    select c.id, c.patient_name from invites i join circles c on c.id = i.circle_id where i.token = ${token}
    limit 1`;
  return row ?? null;
}

/** "Ploy and Tom": who to ask to be added. */
export async function caretakerNames(circleId: string): Promise<string[]> {
  const rows = await sql<{ name: string | null; email: string }[]>`
    select u.name, u.email from memberships m join users u on u.id = m.user_id
    where m.circle_id = ${circleId} and m.role = 'caretaker' order by m.joined_at`;
  return rows.map((r) => r.name ?? r.email);
}
