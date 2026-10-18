import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, badRequest, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canEditCircle } from "@/lib/authz";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { setHeadstone } from "@/lib/db/queries/tributes";

const Year = z.number().int().min(1850).max(2200).nullable();
const Body = z.object({
  birthYear: Year,
  deathYear: Year,
  epitaph: z.string().trim().max(120).nullable().transform((v) => v || null),
});

/** The owner or a caretaker sets the years and words on the "In loving memory" headstone. */
export const PUT = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canEditCircle({ userId: user.id, role: circle.role })) throw forbidden("Only the owner and caretakers can change this.");
  const h = await readBody(req, Body);
  if (h.birthYear && h.deathYear && h.deathYear < h.birthYear) throw badRequest("The second year should come after the first.");
  await setHeadstone(circle.id, h);
  return NextResponse.json(h);
});
