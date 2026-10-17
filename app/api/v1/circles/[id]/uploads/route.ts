import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound, HttpError } from "@/lib/http";
import { canPost, POST_FORBIDDEN } from "@/lib/authz";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { MAX_PHOTOS } from "@/lib/images";
import { LIMITS, kindOf } from "@/lib/mediaLimits";
import { signedUpload, storageConfigured } from "@/lib/storage";

const File = z
  .object({ type: z.string().min(1), size: z.number().int().positive() })
  .superRefine((f, ctx) => {
    const kind = kindOf(f.type);
    if (!kind) return ctx.addIssue({ code: "custom", message: "That kind of file can’t be added. Try a photo, voice note or video." });
    if (f.size > LIMITS[kind].maxBytes) ctx.addIssue({ code: "custom", message: LIMITS[kind].label });
  });

const Body = z.object({ files: z.array(File).min(1).max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} files at a time.`) });

/**
 * Step 1 of adding photos, voice notes or videos: one signed upload slot per file, in a staging folder. The browser
 * uploads originals straight to Storage (Vercel caps request bodies at 4.5MB).
 */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canPost({ userId: user.id, role: circle.role })) throw forbidden(POST_FORBIDDEN);
  if (!storageConfigured()) throw new HttpError(503, "storage_unavailable", "Photo storage isn’t set up on this server.");
  const { files } = await readBody(req, Body);
  const slots = await Promise.all(
    files.map(async () => {
      const mediaId = crypto.randomUUID();
      const { path, token } = await signedUpload(`${circle.id}/incoming/${user.id}/${mediaId}`);
      return { mediaId, path, token };
    }),
  );
  return NextResponse.json({ slots });
});
