import { NextResponse } from "next/server";
import { z } from "zod";
import { route, badRequest, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canInvite } from "@/lib/authz";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { removePerson } from "@/lib/db/queries/people";

/** The owner or a caretaker takes someone out of the circle (not the owner, and not themselves). */
export const DELETE = route<{ id: string; userId: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canInvite({ userId: user.id, role: circle.role })) throw forbidden("Only the owner and caretakers can remove people.");
  const target = z.uuid().parse(params.userId);
  if (target === user.id) throw badRequest("You can’t remove yourself.");
  if (!(await removePerson(circle.id, target))) throw notFound("They’re not in this circle (or they’re its owner).");
  return NextResponse.json({ removed: target });
});
