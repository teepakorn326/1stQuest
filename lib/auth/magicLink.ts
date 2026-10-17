import "server-only";
import { appUrl } from "@/lib/env";
import { consumeMagicLink, countRecentMagicLinks, insertMagicLink } from "@/lib/db/queries/magicLinks";
import { hashToken, randomToken, safeNextPath } from "@/lib/auth/tokens";

export const MAGIC_LINK_TTL_MINUTES = 15;
const MAX_LINKS_PER_15_MIN = 5;

export async function issueMagicLink(email: string, next: unknown): Promise<{ url: string } | { rateLimited: true }> {
  if ((await countRecentMagicLinks(email, 15)) >= MAX_LINKS_PER_15_MIN) return { rateLimited: true };
  const token = randomToken();
  await insertMagicLink({
    tokenHash: hashToken(token),
    email,
    nextPath: safeNextPath(next),
    ttlMinutes: MAGIC_LINK_TTL_MINUTES,
  });
  return { url: `${appUrl()}/verify?token=${encodeURIComponent(token)}` };
}

export async function redeemMagicLink(token: string) {
  return consumeMagicLink(hashToken(token));
}
