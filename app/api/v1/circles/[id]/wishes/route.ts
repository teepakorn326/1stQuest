import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, conflict, forbidden, notFound } from "@/lib/http";
import { canPost, POST_FORBIDDEN } from "@/lib/authz";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { createWish } from "@/lib/db/queries/wishes";
import { queueTexts, textFor } from "@/lib/notify";
import { WishInput } from "@/lib/validation";

/** Any member can add a wish (doctors included). */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canPost({ userId: user.id, role: circle.role })) throw forbidden(POST_FORBIDDEN);
  if (circle.mode === "memorial") throw conflict("This book is a memorial album now. Share a memory instead.", "memorial_mode");
  const input = await readBody(req, WishInput);
  const wish = await createWish(circle.id, user.id, input);
  queueTexts(wish.sms, textFor({ kind: "wish", actorName: user.name ?? "The owner", patientName: circle.patient_name, title: wish.text, path: `/wishes/${wish.id}` }));
  return NextResponse.json({ wish: { id: wish.id } }, { status: 201 });
});
