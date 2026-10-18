import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound, badRequest, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canPost, canSeeWish, POST_FORBIDDEN } from "@/lib/authz";
import { AiError } from "@/lib/ai";
import { photosForModel, writeCard } from "@/lib/cards";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { createCard } from "@/lib/db/queries/cards";
import { findMediaByIds } from "@/lib/db/queries/media";
import { findWishForMember } from "@/lib/db/queries/wishes";
import { MAX_PHOTOS } from "@/lib/images";
import { queueTexts, textFor } from "@/lib/notify";

export const maxDuration = 60;

const Body = z.object({
  story: z.string().trim().max(2000).default(""),
  mediaIds: z.array(z.uuid()).max(MAX_PHOTOS).default([]),
});

/** "Make the card": the model writes the title and body from the story and photos. */
export const POST = route<{ id: string }>(async (req, { params, log }) => {
  const user = await requireApiUser();
  const wish = await findWishForMember(z.uuid().parse(params.id), user.id);
  if (!wish || !canSeeWish({ userId: user.id, role: wish.viewer_role }, wish, wish.viewer_ids)) throw notFound();
  if (!canPost({ userId: user.id, role: wish.viewer_role })) throw forbidden(POST_FORBIDDEN);
  const { story, mediaIds } = await readBody(req, Body);

  const media = (await findMediaByIds(wish.circle_id, mediaIds)).filter((m) => m.uploader_id === user.id && !m.card_id);
  if (!story && media.length === 0) throw badRequest("Add a photo, a voice note or a few words about what happened.");
  const ordered = mediaIds.map((id) => media.find((m) => m.id === id)).filter((m) => m !== undefined);
  const circle = await findCircleForMember(wish.circle_id, user.id);
  if (!circle) throw notFound();

  try {
    const words = await writeCard({
      patientName: circle.patient_name,
      authorName: user.name ?? "Someone",
      wish: { text: wish.text, category: wish.category },
      story,
      images: await photosForModel(ordered.filter((m) => m.kind === "photo").map((m) => m.path)),
    });
    const card = await createCard({
      circleId: wish.circle_id,
      authorId: user.id,
      wish: { id: wish.id, text: wish.text, category: wish.category },
      category: wish.category,
      title: words.title.slice(0, 80),
      body: words.body.slice(0, 600),
      story,
      place: words.place?.slice(0, 40) ?? null,
      mediaIds: ordered.map((m) => m.id),
    });
    queueTexts(card.sms, textFor({ kind: "card", actorName: user.name ?? "A caretaker", patientName: circle.patient_name, title: card.title, path: `/cards/${card.id}` }));
    return NextResponse.json({ card: { id: card.id } }, { status: 201 });
  } catch (err) {
    if (err instanceof AiError) {
      log.warn("card failed", { code: err.code, wishId: wish.id });
      throw new HttpError(503, `ai_${err.code}`, "We couldn’t write the card just now. Your photos and words are safe; try again.");
    }
    throw err;
  }
});
