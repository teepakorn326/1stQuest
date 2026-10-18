import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { route, badRequest, forbidden, notFound } from "@/lib/http";
import { canEditCircle } from "@/lib/authz";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember, setCirclePhoto } from "@/lib/db/queries/circles";
import { signedUrl, storageConfigured, uploadObject } from "@/lib/storage";

/** Members only → 302 to a 10-minute signed URL for the patient photo. */
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle?.patient_photo_path || !storageConfigured()) throw notFound();
  return NextResponse.redirect(await signedUrl(circle.patient_photo_path), {
    status: 302,
    headers: { "cache-control": "private, max-age=300" },
  });
});

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * The owner or a caretaker adds or changes the person's photo (multipart "photo"). Resized to
 * 1200px and re-encoded, which also drops EXIF data such as location.
 */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (!canEditCircle({ userId: user.id, role: circle.role })) throw forbidden("Only the owner and caretakers can change the photo.");
  if (!storageConfigured()) throw badRequest("Photos aren’t set up on this server.");
  const photo = (await req.formData()).get("photo");
  if (!(photo instanceof File) || photo.size === 0) throw badRequest("Choose a photo.");
  if (!PHOTO_TYPES.includes(photo.type)) throw badRequest("Photos can be JPG, PNG or WebP.");
  if (photo.size > 15 * 1024 * 1024) throw badRequest("That photo is over 15MB.");
  const jpeg = await sharp(Buffer.from(await photo.arrayBuffer()))
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  // A new name each time, so browsers don't keep showing the old photo.
  const path = `${circle.id}/patient-${Date.now()}.jpg`;
  await uploadObject(path, jpeg, "image/jpeg");
  await setCirclePhoto(circle.id, path);
  return NextResponse.json({ ok: true }, { status: 201 });
});
