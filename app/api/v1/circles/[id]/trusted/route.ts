import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, badRequest, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { findMembership } from "@/lib/db/queries/memberships";
import { setTrusted } from "@/lib/db/queries/memorial";
import { canNameTrusted } from "@/lib/memorial";

const Body = z.object({ userId: z.uuid().nullable() });

/** The owner names the family member who can turn the book into a memorial album if they can't. */
export const PUT = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const { userId } = await readBody(req, Body);
  const candidate = userId ? await findMembership(circle.id, userId) : null;
  if (userId && !candidate) throw badRequest("Pick someone in the circle.");
  if (!canNameTrusted({ userId: user.id, role: circle.role }, candidate?.role ?? null)) {
    throw circle.role === "owner" ? badRequest("The trusted person has to be a family member.") : forbidden("Only the circle’s owner can choose this.");
  }
  if (!(await setTrusted(circle.id, userId))) throw badRequest("Pick a family member in the circle.");
  return NextResponse.json({ trustedUserId: userId });
});
