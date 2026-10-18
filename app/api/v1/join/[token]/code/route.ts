import { NextResponse } from "next/server";
import { route, conflict, HttpError, notFound, readBody } from "@/lib/http";
import { issueLoginCode } from "@/lib/auth/loginCode";
import { emailSender } from "@/lib/email";
import { findJoinTarget } from "@/lib/db/queries/people";
import { findUserByPhone } from "@/lib/db/queries/users";
import { Registration } from "@/lib/joinFields";

/** Step 1 of registering from a circle's link: check the details, then email a 6-digit code. */
export const POST = route<{ token: string }>(async (req, { params }) => {
  const target = await findJoinTarget(params.token);
  if (!target) throw notFound("We couldn’t find that circle. Ask for the link again.");
  const r = await readBody(req, Registration);
  if (r.phone) {
    const owner = await findUserByPhone(r.phone);
    if (owner && owner.email !== r.email) throw conflict("That mobile number is already on another account.", "phone_taken");
  }
  const issued = await issueLoginCode(r.email, `/join/${params.token}`);
  if ("rateLimited" in issued) throw new HttpError(429, "rate_limited", "We’ve sent a few codes already. Check your email, or try again in 15 minutes.");
  const sender = emailSender();
  await sender.sendCode({ to: r.email, code: issued.code });
  return NextResponse.json(sender.delivers ? { sent: true } : { sent: false, devCode: issued.code });
});
