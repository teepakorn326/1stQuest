import { NextResponse } from "next/server";
import { Email } from "@/lib/fields";
import { z } from "zod";
import { readBody, route, HttpError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireApiUser, startSession } from "@/lib/auth/session";
import { findUserByEmail, setPasswordHash } from "@/lib/db/queries/users";

const SignIn = z.object({
  email: Email,
  password: z.string().min(1).max(200),
});

/** Sign in with email + password (only for people who chose to set one). */
export const POST = route(async (req) => {
  const { email, password } = await readBody(req, SignIn);
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new HttpError(401, "invalid_credentials", "That email and password don't match. You can use a sign-in link instead.");
  }
  await startSession(user.id);
  return NextResponse.json({ ok: true });
});

const SetPassword = z.object({ password: z.string().min(8, "Use at least 8 characters.").max(200) });

/** Set or change the signed-in user's password. */
export const PUT = route(async (req) => {
  const user = await requireApiUser();
  const { password } = await readBody(req, SetPassword);
  await setPasswordHash(user.id, await hashPassword(password));
  return NextResponse.json({ ok: true });
});
