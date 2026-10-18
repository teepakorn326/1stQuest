import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, HttpError, notFound } from "@/lib/http";
import { issueLoginCode } from "@/lib/auth/loginCode";
import { emailSender } from "@/lib/email";
import { findUserByPhone } from "@/lib/db/queries/users";
import { smsSender } from "@/lib/sms";
import { Contact } from "@/lib/auth/contact";

const Body = z.intersection(Contact, z.object({ next: z.string().nullish() }));

/**
 * Sends a 6-digit sign-in code by email (anyone: first sign-in creates the account) or by text (only
 * to a number a caretaker added, or one saved on an account). Without email/SMS set up (dev mode),
 * the code comes back in the response and is shown on screen.
 */
export const POST = route(async (req, { log }) => {
  const body = await readBody(req, Body);
  const via = "email" in body ? "email" : "sms";
  const contact = "email" in body ? body.email : body.phone;
  if (via === "sms" && !(await findUserByPhone(contact))) {
    throw notFound("We don’t know this number yet. Sign in with your email, or ask a caretaker to add your number.");
  }
  const issued = await issueLoginCode(contact, body.next);
  if ("rateLimited" in issued) {
    throw new HttpError(429, "rate_limited", "We’ve sent a few codes already. Check your messages, or try again in 15 minutes.");
  }
  let delivered: boolean;
  if (via === "email") {
    const sender = emailSender();
    await sender.sendCode({ to: contact, code: issued.code });
    delivered = sender.delivers;
  } else {
    const sender = smsSender();
    await sender.send(contact, `${issued.code} is your 1stQuest code. It expires in 10 minutes.`);
    delivered = sender.delivers;
  }
  log.info("sign-in code issued", { via, delivered });
  return NextResponse.json(delivered ? { sent: true, via } : { sent: false, via, devCode: issued.code });
});
