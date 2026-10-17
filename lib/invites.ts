import "server-only";
import { randomToken } from "@/lib/auth/tokens";
import { appUrl } from "@/lib/env";
import { createInvite, findActiveInvite } from "@/lib/db/queries/invites";
import type { InviteRole } from "@/lib/db/types";

/** Current shareable invite URL for a circle+role, minting a new token when none is active. */
export async function inviteUrl(circleId: string, role: InviteRole, createdBy: string): Promise<string> {
  const invite =
    (await findActiveInvite(circleId, role)) ?? (await createInvite({ circleId, role, token: randomToken(24), createdBy }));
  return `${appUrl()}/join/${invite.token}`;
}
