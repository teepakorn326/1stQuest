import { NextResponse } from "next/server";
import { route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canPost } from "@/lib/authz";
import { randomToken } from "@/lib/auth/tokens";
import { requireCard } from "@/lib/cardAccess";
import { setCardShare } from "@/lib/db/queries/cards";
import { appUrl } from "@/lib/env";

async function requireOwnCard(id: string, userId: string) {
  const card = await requireCard(id, userId);
  if (!canPost({ userId, role: card.viewer_role }) || card.author_id !== userId) {
    throw forbidden("Only the person who made this card can share it.");
  }
  return card;
}

/** Turn on the public link for this one card (reuses the existing link if already shared). */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const card = await requireOwnCard(params.id, user.id);
  const token = await setCardShare(card.id, user.id, randomToken(18));
  if (!token) throw notFound();
  return NextResponse.json({ url: `${appUrl()}/s/${token}` });
});

/** Stop sharing: the old link stops working straight away. */
export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const card = await requireOwnCard(params.id, user.id);
  await setCardShare(card.id, user.id, null);
  return NextResponse.json({ ok: true });
});
