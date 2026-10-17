import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, badRequest } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { requireCard } from "@/lib/cardAccess";
import { attachPhotosToCard } from "@/lib/db/queries/media";
import { MAX_PHOTOS } from "@/lib/images";

const Body = z.object({ mediaIds: z.array(z.uuid()).min(1).max(MAX_PHOTOS) });

/** More photos on an existing card (already processed via /circles/:id/photos). */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const card = await requireCard(params.id, user.id);
  const { mediaIds } = await readBody(req, Body);
  const n = await attachPhotosToCard({
    cardId: card.id,
    circleId: card.circle_id,
    wishId: card.wish_id,
    wishText: card.wish_text,
    cardTitle: card.title,
    actorId: user.id,
    mediaIds,
  });
  if (n === 0) throw badRequest("Those photos couldn’t be added.");
  return NextResponse.json({ added: n });
});
