import "server-only";
import { PersonError, upsertPerson, type PersonInput } from "@/lib/db/queries/people";
import { sql } from "@/lib/db/client";
import { insertActivity } from "@/lib/db/queries/activity";
import type { CircleRow, Mobility, Role } from "@/lib/db/types";

export type MyCircle = CircleRow & { role: Role; member_count: number };

/** Circles the user belongs to, with their role and member count, in one query. */
export async function listMyCircles(userId: string): Promise<MyCircle[]> {
  return sql<MyCircle[]>`
    select c.*, m.role,
      (select count(*)::int from memberships mm where mm.circle_id = c.id) as member_count
    from memberships m join circles c on c.id = m.circle_id
    where m.user_id = ${userId}
    order by m.joined_at asc`;
}

/** A circle plus the viewer's role — null when the user is not a member. */
export async function findCircleForMember(circleId: string, userId: string): Promise<(CircleRow & { role: Role }) | null> {
  const [row] = await sql<(CircleRow & { role: Role })[]>`
    select c.*, m.role from circles c
    join memberships m on m.circle_id = c.id and m.user_id = ${userId}
    where c.id = ${circleId}`;
  return row ?? null;
}

/**
 * A caretaker creates a circle for someone: that person gets an account (by email, with their mobile
 * number if given) and is the circle's owner; the caretaker who made it is a caretaker.
 */
export async function createCircle(input: {
  caretakerId: string;
  patient: PersonInput;
  mobility: Mobility;
  mobilityNotes: string | null;
}): Promise<CircleRow> {
  return sql.begin(async (tx) => {
    const owner = await upsertPerson(tx, input.patient);
    if (owner.id === input.caretakerId) throw new PersonError("is_you");
    const [circle] = await tx<CircleRow[]>`
      insert into circles (patient_name, mobility, mobility_notes, set_up_by_patient)
      values (${input.patient.name.trim()}, ${input.mobility}, ${input.mobilityNotes}, false)
      returning *`;
    await tx`insert into memberships (circle_id, user_id, role) values
      (${circle!.id}, ${owner.id}, 'owner'), (${circle!.id}, ${input.caretakerId}, 'caretaker')`;
    await insertActivity(tx, { circleId: circle!.id, actorId: input.caretakerId, type: "circle_created", refId: circle!.id });
    return circle!;
  });
}

export async function setCirclePhoto(circleId: string, path: string): Promise<void> {
  await sql`update circles set patient_photo_path = ${path} where id = ${circleId}`;
}

export async function updateMobility(input: {
  circleId: string;
  actorId: string;
  mobility: Mobility;
  mobilityNotes: string | null;
}): Promise<CircleRow> {
  return sql.begin(async (tx) => {
    const [circle] = await tx<CircleRow[]>`
      update circles set mobility = ${input.mobility}, mobility_notes = ${input.mobilityNotes}
      where id = ${input.circleId} returning *`;
    await insertActivity(tx, {
      circleId: input.circleId,
      actorId: input.actorId,
      type: "mobility_updated",
      payload: { mobility: input.mobility },
    });
    return circle!;
  });
}

export async function setCircleMode(circleId: string, mode: "active" | "memorial"): Promise<CircleRow> {
  return sql.begin(async (tx) => {
    const [row] = await tx<CircleRow[]>`
      update circles set mode = ${mode}, mode_changed_at = now() where id = ${circleId} returning *`;
    // The owner did it themselves: any family request to do the same is done with.
    if (mode === "memorial") {
      await tx`update memorial_requests set closed_at = now(), outcome = 'switched' where circle_id = ${circleId} and closed_at is null`;
    }
    return row!;
  });
}
