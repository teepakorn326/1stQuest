import { NextResponse } from "next/server";
import { z } from "zod";
import { route, HttpError } from "@/lib/http";
import { requireApiUser, setActiveCircle } from "@/lib/auth/session";
import { acceptInvite } from "@/lib/db/queries/invites";

export const POST = route<{ token: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const token = z.string().min(10).max(100).parse(params.token);
  const result = await acceptInvite(token, user.id);
  if (!result.ok) {
    throw result.reason === "expired"
      ? new HttpError(410, "invite_expired", "This invite has expired. Ask for a new link.")
      : new HttpError(404, "invite_not_found", "We couldn't find that invite.");
  }
  await setActiveCircle(result.circleId);
  return NextResponse.json({ circleId: result.circleId, role: result.role, alreadyMember: result.alreadyMember });
});
