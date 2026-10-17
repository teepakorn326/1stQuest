import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canPost, canSeeWish, POST_FORBIDDEN } from "@/lib/authz";
import { findWishForMember, updateWish } from "@/lib/db/queries/wishes";
import { WishInput } from "@/lib/validation";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { queueTexts, textFor } from "@/lib/notify";

/** Only the author changes a wish's words or who can see it. */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const wish = await findWishForMember(z.uuid().parse(params.id), user.id);
  if (!wish || !canSeeWish({ userId: user.id, role: wish.viewer_role }, wish, wish.viewer_ids)) throw notFound();
  if (!canPost({ userId: user.id, role: wish.viewer_role }) || wish.author_id !== user.id) throw forbidden(POST_FORBIDDEN);
  const input = await readBody(req, WishInput);
  const updated = await updateWish(wish.id, user.id, input);
  if (!updated) throw notFound();
  const circle = await findCircleForMember(wish.circle_id, user.id);
  queueTexts(updated.sms, textFor({ kind: "wish", actorName: user.name ?? "The owner", patientName: circle?.patient_name ?? "the", title: updated.text, path: `/wishes/${updated.id}` }));
  return NextResponse.json({ wish: { id: updated.id } });
});
