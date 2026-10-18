import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, badRequest, forbidden } from "@/lib/http";
import { canPost, POST_FORBIDDEN } from "@/lib/authz";
import { requireApiUser } from "@/lib/auth/session";
import { requireCard } from "@/lib/cardAccess";
import { attachPhotosToCard } from "@/lib/db/queries/media";
import { MAX_PHOTOS } from "@/lib/images";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { queueTexts, textFor } from "@/lib/notify";

const Body = z.object({ mediaIds: z.array(z.uuid()).min(1).max(MAX_PHOTOS) });

/** More photos on an existing card (already processed via /circles/:id/photos). */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const card = await requireCard(params.id, user.id);
  if (!canPost({ userId: user.id, role: card.viewer_role })) throw forbidden(POST_FORBIDDEN);
  const { mediaIds } = await readBody(req, Body);
  const { added, levelledUp, sms } = await attachPhotosToCard({
    cardId: card.id,
    circleId: card.circle_id,
    wishId: card.wish_id,
    wishText: card.wish_text,
    cardTitle: card.title,
    actorId: user.id,
    mediaIds,
  });
  if (added === 0) throw badRequest("Those photos couldn’t be added.");
  const circle = await findCircleForMember(card.circle_id, user.id);
  queueTexts(sms, textFor({ kind: "media", actorName: user.name ?? "A caretaker", patientName: circle?.patient_name ?? "the", title: card.title, path: `/cards/${card.id}` }));
  return NextResponse.json({ added, levelledUp });
});
