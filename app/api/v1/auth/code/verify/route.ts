import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, HttpError } from "@/lib/http";
import { checkLoginCode } from "@/lib/auth/loginCode";
import { startSession } from "@/lib/auth/session";
import { findUserByPhone, upsertUserByEmail } from "@/lib/db/queries/users";
import { Contact } from "@/lib/auth/contact";

const Body = z.intersection(Contact, z.object({ code: z.string().trim().min(4).max(12) }));

const WHY = {
  wrong: "That code isn’t right. Check it and try again.",
  expired: "That code has expired or was already used. We can send you a new one.",
  too_many: "Too many tries. Ask for a new code.",
} as const;

/** Checks the code, signs in, and says where to go next (the name screen on a first sign-in). */
export const POST = route(async (req) => {
  const body = await readBody(req, Body);
  const contact = "email" in body ? body.email : body.phone;
  const result = await checkLoginCode(contact, body.code);
  if (!result.ok) throw new HttpError(result.reason === "wrong" ? 400 : 410, `code_${result.reason}`, WHY[result.reason]);
  const user = "email" in body ? await upsertUserByEmail(body.email) : await findUserByPhone(body.phone);
  if (!user) throw new HttpError(410, "code_expired", WHY.expired);
  await startSession(user.id);
  const dest = result.next ?? "/home";
  return NextResponse.json({ next: user.name ? dest : `/welcome?next=${encodeURIComponent(dest)}` });
});
