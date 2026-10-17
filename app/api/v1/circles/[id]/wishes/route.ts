import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { createWish } from "@/lib/db/queries/wishes";
import { WishInput } from "@/lib/validation";

/** Any member can add a wish (doctors included). */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const input = await readBody(req, WishInput);
  const wish = await createWish(circle.id, user.id, input);
  return NextResponse.json({ wish: { id: wish.id } }, { status: 201 });
});
