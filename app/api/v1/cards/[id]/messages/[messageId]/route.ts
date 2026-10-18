import { NextResponse } from "next/server";
import { z } from "zod";
import { route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canPost } from "@/lib/authz";
import { findCardForMember, removeGuestMessage } from "@/lib/db/queries/cards";

/** The owner or a caretaker removes a comment that was left from the card's public share link. */
export const DELETE = route<{ id: string; messageId: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const card = await findCardForMember(z.uuid().parse(params.id), user.id);
  if (!card) throw notFound();
  if (!canPost({ userId: user.id, role: card.viewer_role })) throw forbidden("Only the owner and caretakers can remove comments.");
  if (!(await removeGuestMessage(card.id, z.uuid().parse(params.messageId)))) throw notFound("That comment is already gone.");
  return NextResponse.json({ removed: params.messageId });
});
