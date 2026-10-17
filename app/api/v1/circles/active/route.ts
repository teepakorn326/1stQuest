import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, notFound } from "@/lib/http";
import { requireApiUser, setActiveCircle } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";

const Body = z.object({ circleId: z.uuid() });

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const { circleId } = await readBody(req, Body);
  if (!(await findCircleForMember(circleId, user.id))) throw notFound();
  await setActiveCircle(circleId);
  return NextResponse.json({ ok: true });
});
