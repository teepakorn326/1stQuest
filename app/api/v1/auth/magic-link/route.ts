import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, HttpError } from "@/lib/http";
import { issueMagicLink } from "@/lib/auth/magicLink";
import { emailSender } from "@/lib/email";

const Body = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email.")),
  next: z.string().nullish(),
});

export const POST = route(async (req, { log }) => {
  const { email, next } = await readBody(req, Body);
  const issued = await issueMagicLink(email, next);
  if ("rateLimited" in issued) {
    throw new HttpError(429, "rate_limited", "We've sent a few links already. Please check your inbox, or try again in 15 minutes.");
  }
  const sender = emailSender();
  await sender.sendSignIn({ to: email, url: issued.url });
  log.info("magic link issued", { delivered: sender.delivers });
  return NextResponse.json(sender.delivers ? { sent: true } : { sent: false, devLink: issued.url });
});
