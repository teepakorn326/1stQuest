import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appUrl, env } from "@/lib/env";
import { CIRCLE_COOKIE, SESSION_COOKIE, sign, unsign } from "@/lib/auth/cookie";
import { createSession, deleteSession, findSessionUser } from "@/lib/db/queries/sessions";
import { findCircleForMember, listMyCircles } from "@/lib/db/queries/circles";
import { applyDueRequest } from "@/lib/db/queries/memorial";
import { queueTexts } from "@/lib/notify";
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
  let circle: (CircleRow & { role: Role }) | null = null;
  if (wanted && /^[0-9a-f-]{36}$/i.test(wanted)) circle = await findCircleForMember(wanted, userId);
  if (!circle) circle = (await listMyCircles(userId))[0] ?? null;
  // A confirmed memorial request whose 7 days are up is carried out the next time anyone opens the circle.
  if (circle?.mode === "active") {
    const done = await applyDueRequest({ circleId: circle.id, patientName: circle.patient_name });
    if (done) {
      queueTexts(done.sms, `1stQuest: ${circle.patient_name}’s book is now a memorial album. ${appUrl()}/home`);
      circle = await findCircleForMember(circle.id, userId);
    }
  }
  return circle;
});
