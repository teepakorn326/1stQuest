import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound, badRequest, conflict, HttpError } from "@/lib/http";
import { canPost, POST_FORBIDDEN } from "@/lib/authz";
import { requireApiUser } from "@/lib/auth/session";
import { AiError } from "@/lib/ai";
import { photosForModel, writeCard } from "@/lib/cards";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { createCard } from "@/lib/db/queries/cards";
import { findMediaByIds } from "@/lib/db/queries/media";
import { CATEGORIES, type Category } from "@/lib/db/types";
import { MAX_PHOTOS } from "@/lib/images";
import { queueTexts, textFor } from "@/lib/notify";

export const maxDuration = 60;

const Body = z.object({
  category: z.enum(CATEGORIES as [Category, ...Category[]]),
  story: z.string().trim().max(2000).default(""),
  mediaIds: z.array(z.uuid()).max(MAX_PHOTOS).default([]),
});

/** Memorial mode: "Share a memory" makes a card with no wish, written as a remembrance. */
export const POST = route<{ id: string }>(async (req, { params, log }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canPost({ userId: user.id, role: circle.role })) throw forbidden(POST_FORBIDDEN);
  if (circle.mode !== "memorial") throw conflict("Memories are shared once the book is a memorial album. Add moments to a wish instead.");
  const { category, story, mediaIds } = await readBody(req, Body);

  const media = (await findMediaByIds(circle.id, mediaIds)).filter((m) => m.uploader_id === user.id && !m.card_id);
  if (!story && media.length === 0) throw badRequest("Add a photo, a voice note or a few words.");
  const ordered = mediaIds.map((id) => media.find((m) => m.id === id)).filter((m) => m !== undefined);

  try {
    const words = await writeCard({
      patientName: circle.patient_name,
      authorName: user.name ?? "Someone",
      wish: null,
      story,
      images: await photosForModel(ordered.filter((m) => m.kind === "photo").map((m) => m.path)),
      remembrance: true,
    });
    const card = await createCard({
      circleId: circle.id,
      authorId: user.id,
      wish: null,
      category,
      title: words.title.slice(0, 80),
      body: words.body.slice(0, 600),
      story,
      place: words.place?.slice(0, 40) ?? null,
      mediaIds: ordered.map((m) => m.id),
    });
    queueTexts(card.sms, textFor({ kind: "memory", actorName: user.name ?? "The owner", patientName: circle.patient_name, title: card.title, path: `/cards/${card.id}` }));
    return NextResponse.json({ card: { id: card.id } }, { status: 201 });
  } catch (err) {
    if (err instanceof AiError) {
      log.warn("memory card failed", { code: err.code });
      throw new HttpError(503, `ai_${err.code}`, "We couldn’t write the card just now. Your photos and words are safe; try again.");
    }
    throw err;
  }
});
