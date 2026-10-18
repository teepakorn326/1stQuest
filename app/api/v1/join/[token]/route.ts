import { NextResponse } from "next/server";
import { z } from "zod";
import { route, notFound, readBody } from "@/lib/http";
import { requireApiUser, setActiveCircle } from "@/lib/auth/session";
import { findJoinTarget, joinCircle } from "@/lib/db/queries/people";

const Body = z.object({ role: z.enum(["viewer", "health"]) });

/** Already signed in: join the circle from its link as a viewer or health professional. */
export const POST = route<{ token: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const target = await findJoinTarget(params.token);
  if (!target) throw notFound("We couldn’t find that circle. Ask for the link again.");
  const { role } = await readBody(req, Body);
  await joinCircle({ name: user.name ?? "", email: user.email, phone: null, circleId: target.circle_id, role });
  await setActiveCircle(target.circle_id);
  return NextResponse.json({ next: "/home" });
});
