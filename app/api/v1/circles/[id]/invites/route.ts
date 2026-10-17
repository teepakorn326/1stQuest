import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canInvite } from "@/lib/authz";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { inviteUrl } from "@/lib/invites";

const Body = z.object({ role: z.enum(["family", "doctor"]) });

/** Returns the current invite link for a role, creating one if needed. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canInvite({ userId: user.id, role: circle.role })) throw forbidden("Only the owner and family can invite people.");
  const { role } = await readBody(req, Body);
  return NextResponse.json({ url: await inviteUrl(circle.id, role, user.id), role });
});
