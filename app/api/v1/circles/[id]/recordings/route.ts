import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, notFound, badRequest } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { findMediaByIds, insertMedia } from "@/lib/db/queries/media";
import { LIMITS, baseType, extFor, kindOf } from "@/lib/mediaLimits";
import { moveObject, objectInfo, removeObjects } from "@/lib/storage";

const Body = z.object({
  mediaId: z.uuid(),
  durationSec: z.number().min(0).max(60 * 60),
});

/**
 * Step 2 for a voice note or video: check the staged upload's real size and type, then move it
 * to <circleId>/<mediaId>.<ext>. No re-encoding. Duration comes from the browser (the server has
 * no media probe); size is enforced here against the stored object.
 */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const { mediaId, durationSec } = await readBody(req, Body);

  const [existing] = await findMediaByIds(circle.id, [mediaId]);
  if (existing) {
    if (existing.uploader_id !== user.id) throw notFound();
    return NextResponse.json({ mediaId: existing.id });
  }

  const staged = `${circle.id}/incoming/${user.id}/${mediaId}`;
  const info = await objectInfo(staged);
  if (!info) throw badRequest("We couldn’t find that recording. Try again.");
  const type = baseType(info.contentType ?? "");
  const kind = kindOf(type);
  if (!kind || kind === "photo") {
    await removeObjects([staged]);
    throw badRequest("That file isn’t a voice note or video.");
  }
  const limit = LIMITS[kind];
  if (info.size > limit.maxBytes || (limit.maxSeconds && durationSec > limit.maxSeconds + 1)) {
    await removeObjects([staged]);
    throw badRequest(limit.label);
  }

  const path = `${circle.id}/${mediaId}.${extFor(type)}`;
  await moveObject(staged, path);
  await insertMedia({ id: mediaId, circleId: circle.id, uploaderId: user.id, path, mimeType: type, bytes: info.size, kind, durationSec: Math.round(durationSec) });
  return NextResponse.json({ mediaId });
});
