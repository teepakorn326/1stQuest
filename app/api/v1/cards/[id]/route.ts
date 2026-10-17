import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { requireCard } from "@/lib/cardAccess";
import { updateCardWords } from "@/lib/db/queries/cards";

const Body = z.object({
  title: z.string().trim().min(1, "Give the card a title.").max(80),
  body: z.string().trim().min(1, "Add a few words.").max(600),
});

/** "Change the words" — the person who made the card. */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const card = await requireCard(params.id, user.id);
  if (card.author_id !== user.id) throw forbidden("Only the person who made this card can change its words.");
  const { title, body } = await readBody(req, Body);
  await updateCardWords(card.id, user.id, title, body);
  return NextResponse.json({ ok: true });
});
