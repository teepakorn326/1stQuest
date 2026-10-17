import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canSwitchMode } from "@/lib/authz";
import { findCircleForMember, setCircleMode } from "@/lib/db/queries/circles";

const Body = z.object({ mode: z.enum(["active", "memorial"]) });

/** Owner turns the book into a memorial album, or undoes it within 30 days. */
export const POST = route<{ id: string }>(async (req, { params, log }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const { mode } = await readBody(req, Body);
  if (circle.mode === mode) return NextResponse.json({ mode });
  if (!canSwitchMode({ userId: user.id, role: circle.role }, circle)) {
    throw forbidden(
      circle.role === "owner" ? "The 30 days to undo this have passed." : "Only the circle’s owner can change this.",
    );
  }
  const updated = await setCircleMode(circle.id, mode);
  log.info("circle mode changed", { circleId: circle.id, mode });
  return NextResponse.json({ mode: updated.mode, changedAt: updated.mode_changed_at });
});
