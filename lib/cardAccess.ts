import "server-only";
import { z } from "zod";
import { canSeeCard } from "@/lib/authz";
import { findCardForMember } from "@/lib/db/queries/cards";
import { notFound } from "@/lib/http";

/** Loads a card for the API, 404 for both "missing" and "not yours to see". */
export async function requireCard(id: string, userId: string) {
  const card = await findCardForMember(z.uuid().parse(id), userId);
  if (!card || !canSeeCard({ userId, role: card.viewer_role }, card, card.viewer_ids)) throw notFound();
  return card;
}
