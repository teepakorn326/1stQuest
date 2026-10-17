import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { CIRCLE_COOKIE, SESSION_COOKIE, sign, unsign } from "@/lib/auth/cookie";
import { createSession, deleteSession, findSessionUser } from "@/lib/db/queries/sessions";
import { findCircleForMember, listMyCircles } from "@/lib/db/queries/circles";
import { unauthorized } from "@/lib/http";
import type { CircleRow, Role, UserRow } from "@/lib/db/types";

const secure = process.env.NODE_ENV === "production";

export async function startSession(userId: string): Promise<void> {
  const { id, expiresAt } = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, await sign(id, env().SESSION_SECRET), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const id = await unsign(jar.get(SESSION_COOKIE)?.value, env().SESSION_SECRET);
  if (id) await deleteSession(id);
  jar.delete(SESSION_COOKIE);
  jar.delete(CIRCLE_COOKIE);
}

/** Current user (DB-checked), memoised per request. */
export const getUser = cache(async (): Promise<UserRow | null> => {
  const id = await unsign((await cookies()).get(SESSION_COOKIE)?.value, env().SESSION_SECRET);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return findSessionUser(id);
});

/** For pages: redirect to sign-in when signed out. */
export async function requirePageUser(next = "/home"): Promise<UserRow> {
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/** For route handlers: throw 401 when signed out. */
export async function requireApiUser(): Promise<UserRow> {
  const user = await getUser();
  if (!user) throw unauthorized();
  return user;
}

export async function setActiveCircle(circleId: string): Promise<void> {
  (await cookies()).set(CIRCLE_COOKIE, circleId, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

/**
 * The circle the user is looking at: the cookie's circle if they're still a member,
 * otherwise their first circle. Null if they belong to none.
 */
export const getActiveCircle = cache(async (userId: string): Promise<(CircleRow & { role: Role }) | null> => {
  const wanted = (await cookies()).get(CIRCLE_COOKIE)?.value;
  if (wanted && /^[0-9a-f-]{36}$/i.test(wanted)) {
    const circle = await findCircleForMember(wanted, userId);
    if (circle) return circle;
  }
  const [first] = await listMyCircles(userId);
  return first ?? null;
});
