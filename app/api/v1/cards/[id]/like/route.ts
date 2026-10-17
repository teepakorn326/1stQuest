import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { requireCard } from "@/lib/cardAccess";
import { setLike } from "@/lib/db/queries/cards";

const Body = z.object({ liked: z.boolean() });

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const card = await requireCard(params.id, user.id);
  const { liked } = await readBody(req, Body);
  await setLike(card.id, user.id, liked);
  return NextResponse.json({ liked });
});
