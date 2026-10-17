import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound, badRequest } from "@/lib/http";
import { canPost, POST_FORBIDDEN } from "@/lib/authz";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { findMediaByIds, insertMedia } from "@/lib/db/queries/media";
import { MAX_PHOTOS, normalisePhoto } from "@/lib/images";
import { downloadObject, removeObjects, uploadObject } from "@/lib/storage";

export const maxDuration = 60;

const Body = z.object({ mediaIds: z.array(z.uuid()).min(1).max(MAX_PHOTOS) });

/**
 * Step 2: turn staged uploads into photos. Each original is auto-rotated, resized to 2000px and
 * re-encoded (which strips EXIF/GPS) with sharp, stored at <circleId>/<mediaId>.jpg, and the
 * original deleted. Idempotent: photos already processed are returned as they are.
 */
export const POST = route<{ id: string }>(async (req, { params, log }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canPost({ userId: user.id, role: circle.role })) throw forbidden(POST_FORBIDDEN);
  const { mediaIds } = await readBody(req, Body);

  const done = new Map((await findMediaByIds(circle.id, mediaIds)).map((m) => [m.id, m]));
  const results = await Promise.all(
    mediaIds.map(async (id) => {
      const existing = done.get(id);
      if (existing) return existing.uploader_id === user.id ? existing.id : null;
      const staged = `${circle.id}/incoming/${user.id}/${id}`;
      const original = await downloadObject(staged);
      if (!original) return null;
      try {
        const photo = await normalisePhoto(original);
        const path = `${circle.id}/${id}.jpg`;
        await uploadObject(path, photo.data, "image/jpeg");
        await insertMedia({ id, circleId: circle.id, uploaderId: user.id, path, mimeType: "image/jpeg", bytes: photo.data.length });
        await removeObjects([staged]);
        return id;
      } catch (err) {
        log.warn("photo processing failed", { mediaId: id, error: err instanceof Error ? err.message : String(err) });
        await removeObjects([staged]);
        return null;
      }
    }),
  );
  const ok = results.filter((x): x is string => Boolean(x));
  if (ok.length === 0) throw badRequest("We couldn’t read those photos. Try JPG or PNG files.", "photos_unreadable");
  return NextResponse.json({ mediaIds: ok, skipped: mediaIds.length - ok.length });
});
