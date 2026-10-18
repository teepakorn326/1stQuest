import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { countRecentLoginCodes, insertLoginCode, latestLoginCode, recordWrongAttempt, spendLoginCode } from "@/lib/db/queries/loginCodes";
import { safeNextPath } from "@/lib/auth/tokens";

// Sign-in with a 6-digit code sent to an email address or mobile number. Codes last 10 minutes,
// allow 5 wrong tries, and at most 5 can be requested per address every 15 minutes.
export const CODE_TTL_MINUTES = 10;
const MAX_CODES_PER_15_MIN = 5;
const MAX_ATTEMPTS = 5;

/** Keyed hash: a leaked table doesn't give away codes (a plain hash of 6 digits is trivial to reverse). */
function hashCode(contact: string, code: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(`${contact}:${code}`).digest("hex");
}

export async function issueLoginCode(contact: string, next: unknown): Promise<{ code: string } | { rateLimited: true }> {
  if ((await countRecentLoginCodes(contact, 15)) >= MAX_CODES_PER_15_MIN) return { rateLimited: true };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await insertLoginCode({ contact, codeHash: hashCode(contact, code), nextPath: safeNextPath(next), ttlMinutes: CODE_TTL_MINUTES });
  return { code };
}

export type CheckResult = { ok: true; next: string | null } | { ok: false; reason: "wrong" | "expired" | "too_many" };

export async function checkLoginCode(contact: string, code: string): Promise<CheckResult> {
  const live = await latestLoginCode(contact);
  if (!live || live.expired) return { ok: false, reason: "expired" };
  if (live.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many" };
  const a = Buffer.from(hashCode(contact, code.replace(/\D/g, "")), "hex");
  const b = Buffer.from(live.code_hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await recordWrongAttempt(live.id);
    return { ok: false, reason: live.attempts + 1 >= MAX_ATTEMPTS ? "too_many" : "wrong" };
  }
  if (!(await spendLoginCode(live.id))) return { ok: false, reason: "expired" };
  return { ok: true, next: live.next_path };
}
