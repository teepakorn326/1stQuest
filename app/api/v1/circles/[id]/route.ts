import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canEditCircle } from "@/lib/authz";
import { findCircleForMember, updateMobility } from "@/lib/db/queries/circles";
import { MOBILITIES } from "@/lib/db/types";

const Body = z.object({
  mobility: z.enum(MOBILITIES as [string, ...string[]]),
  mobilityNotes: z.string().trim().max(500).optional().nullable().transform((v) => v || null),
});

/** Update how the person is getting around today. */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canEditCircle({ userId: user.id, role: circle.role })) throw forbidden();
  const body = await readBody(req, Body);
  const updated = await updateMobility({
    circleId: circle.id,
    actorId: user.id,
    mobility: body.mobility as (typeof MOBILITIES)[number],
    mobilityNotes: body.mobilityNotes,
  });
  return NextResponse.json({ circle: { id: updated.id, mobility: updated.mobility, mobilityNotes: updated.mobility_notes } });
});
