import { NextResponse } from "next/server";
import { z } from "zod";
import { route, badRequest } from "@/lib/http";
import { requireApiUser, setActiveCircle } from "@/lib/auth/session";
import { createCircle, listMyCircles, setCirclePhoto } from "@/lib/db/queries/circles";
import { MOBILITIES } from "@/lib/db/types";
import { storageConfigured, uploadObject } from "@/lib/storage";

const Fields = z.object({
  patientName: z.string().trim().min(1, "Who is this circle for?").max(80),
  mobility: z.enum(MOBILITIES as [string, ...string[]]),
  mobilityNotes: z.string().trim().max(500).optional().transform((v) => v || null),
  setUpByPatient: z.enum(["true", "false"]).transform((v) => v === "true"),
});

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export const GET = route(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ circles: await listMyCircles(user.id) });
});

/** multipart/form-data: patientName, mobility, mobilityNotes?, setUpByPatient, photo? */
export const POST = route(async (req, { log }) => {
  const user = await requireApiUser();
  const form = await req.formData();
  const fields = Fields.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));

  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto) {
    if (!PHOTO_TYPES[photo.type]) throw badRequest("Photos can be JPG, PNG or WebP.");
    if (photo.size > MAX_PHOTO_BYTES) throw badRequest("That photo is over 15MB.");
  }

  const circle = await createCircle({
    ownerId: user.id,
    ownerName: null,
    patientName: fields.patientName,
    mobility: fields.mobility as (typeof MOBILITIES)[number],
    mobilityNotes: fields.mobilityNotes,
    setUpByPatient: fields.setUpByPatient,
  });

  if (hasPhoto) {
    if (storageConfigured()) {
      const path = `${circle.id}/patient.${PHOTO_TYPES[photo.type]}`;
      await uploadObject(path, await photo.arrayBuffer(), photo.type);
      await setCirclePhoto(circle.id, path);
    } else {
      log.warn("storage not configured; circle photo skipped", { circleId: circle.id });
    }
  }

  await setActiveCircle(circle.id);
  return NextResponse.json({ circle: { id: circle.id } }, { status: 201 });
});
