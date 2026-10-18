import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canInvite } from "@/lib/authz";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { addPerson } from "@/lib/db/queries/people";
import { Phone, personError } from "@/lib/people";

const Body = z.object({
  name: z.string().trim().min(1, "Add their name.").max(60),
  email: z.string().trim().toLowerCase().pipe(z.email("Add their email, so they can sign in.")),
  phone: Phone,
  role: z.enum(["caretaker", "viewer"]),
});

/**
 * The owner or a caretaker adds someone to the circle. They can then sign in with that email or
 * mobile number (a one-time code) and open the circle's link or QR code.
 */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canInvite({ userId: user.id, role: circle.role })) throw forbidden("Only the owner and caretakers can add people.");
  const input = await readBody(req, Body);
  const person = await addPerson({ ...input, circleId: circle.id, actorId: user.id }).catch((err) => {
    throw personError(err) ?? err;
  });
  return NextResponse.json({ person: { id: person.id, name: person.name, email: person.email, phone: person.phone } }, { status: 201 });
});
