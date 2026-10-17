import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, notFound, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, PHOTO_TYPES } from "@/lib/images";
import { signedUpload, storageConfigured } from "@/lib/storage";

const Body = z.object({
  files: z
    .array(
      z.object({
        type: z.string().refine((t) => (PHOTO_TYPES as readonly string[]).includes(t), "Photos can be JPG, PNG or WebP."),
        size: z.number().int().positive().max(MAX_PHOTO_BYTES, "Each photo can be up to 15MB."),
      }),
    )
    .min(1)
    .max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos at a time.`),
});

/**
 * Step 1 of adding photos: one signed upload slot per file, in a staging folder. The browser
 * uploads originals straight to Storage (Vercel caps request bodies at 4.5MB).
 */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
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
