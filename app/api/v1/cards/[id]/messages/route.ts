import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { requireCard } from "@/lib/cardAccess";
import { addMessage } from "@/lib/db/queries/cards";

const Body = z.object({ text: z.string().trim().min(1).max(1000) });

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const card = await requireCard(params.id, user.id);
  const { text } = await readBody(req, Body);
  const msg = await addMessage(card, user.id, text);
  return NextResponse.json({ message: { id: msg.id } }, { status: 201 });
});
