import { NextResponse } from "next/server";
import { z } from "zod";
import { route, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { signedUrl, storageConfigured } from "@/lib/storage";

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
