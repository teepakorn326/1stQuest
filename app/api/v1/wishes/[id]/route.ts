import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canSeeWish } from "@/lib/authz";
import { findWishForMember, updateWish } from "@/lib/db/queries/wishes";
import { WishInput } from "@/lib/validation";

/** Only the author changes a wish's words or who can see it. */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const wish = await findWishForMember(z.uuid().parse(params.id), user.id);
  if (!wish || !canSeeWish({ userId: user.id, role: wish.viewer_role }, wish, wish.viewer_ids)) throw notFound();
  if (wish.author_id !== user.id) throw forbidden("Only the person who added this wish can change it.");
  const input = await readBody(req, WishInput);
  const updated = await updateWish(wish.id, user.id, input);
  if (!updated) throw notFound();
  return NextResponse.json({ wish: { id: updated.id } });
});
