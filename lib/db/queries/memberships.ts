import "server-only";
import { sql } from "@/lib/db/client";
import type { MembershipRow, Role } from "@/lib/db/types";

export async function findMembership(circleId: string, userId: string): Promise<MembershipRow | null> {
  const [row] = await sql<MembershipRow[]>`
    select * from memberships where circle_id = ${circleId} and user_id = ${userId}`;
  return row ?? null;
}

export type MemberItem = { user_id: string; name: string | null; email: string; phone: string | null; role: Role; joined_at: Date };

export async function listMembers(circleId: string): Promise<MemberItem[]> {
  return sql<MemberItem[]>`
    select m.user_id, u.name, u.email, u.phone, m.role, m.joined_at
    from memberships m join users u on u.id = m.user_id
    where m.circle_id = ${circleId}
    order by (m.role = 'owner') desc, (m.role = 'caretaker') desc, m.joined_at asc`;
}
