import { NextResponse } from "next/server";
import { z } from "zod";
import { route, HttpError, notFound, readBody } from "@/lib/http";
import { checkLoginCode } from "@/lib/auth/loginCode";
import { setActiveCircle, startSession } from "@/lib/auth/session";
import { findJoinTarget, joinCircle } from "@/lib/db/queries/people";
import { Registration } from "@/lib/joinFields";
import { personError } from "@/lib/people";

const Body = Registration.extend({ code: z.string().trim().min(4).max(12) });

const WHY = {
  wrong: "That code isn’t right. Check it and try again.",
  expired: "That code has expired or was already used. We can send you a new one.",
  too_many: "Too many tries. Ask for a new code.",
} as const;

/** Step 2: the code proves the email; the account is made (or found), joins the circle, and signs in. */
export const POST = route<{ token: string }>(async (req, { params }) => {
  const target = await findJoinTarget(params.token);
  if (!target) throw notFound("We couldn’t find that circle. Ask for the link again.");
  const { code, ...r } = await readBody(req, Body);
  const result = await checkLoginCode(r.email, code);
  if (!result.ok) throw new HttpError(result.reason === "wrong" ? 400 : 410, `code_${result.reason}`, WHY[result.reason]);
  const { user } = await joinCircle({ ...r, circleId: target.circle_id }).catch((err) => {
    throw personError(err) ?? err;
  });
  await startSession(user.id);
  await setActiveCircle(target.circle_id);
  return NextResponse.json({ next: "/home" });
});
