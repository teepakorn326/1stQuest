import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, badRequest, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { findMembership } from "@/lib/db/queries/memberships";
import { setTrusted } from "@/lib/db/queries/memorial";
import { canNameTrusted } from "@/lib/memorial";
import { manages } from "@/lib/authz";

const Body = z.object({ userId: z.uuid().nullable() });

/** The owner or a caretaker names the viewer who can turn the book into a memorial album if they can't. */
export const PUT = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const { userId } = await readBody(req, Body);
  const candidate = userId ? await findMembership(circle.id, userId) : null;
  if (userId && !candidate) throw badRequest("Pick someone in the circle.");
  if (!canNameTrusted({ userId: user.id, role: circle.role }, candidate?.role ?? null)) {
    throw manages(circle.role) ? badRequest("The trusted person has to be a viewer in the circle.") : forbidden("Only the owner and caretakers can choose this.");
  }
  if (!(await setTrusted(circle.id, userId))) throw badRequest("Pick a viewer in the circle.");
  return NextResponse.json({ trustedUserId: userId });
});
