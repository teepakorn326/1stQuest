import { NextResponse } from "next/server";
import { z } from "zod";
import { route, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findMediaPathForMember } from "@/lib/db/queries/media";
import { signedUrl, storageConfigured } from "@/lib/storage";

/** Members who can see the card → 302 to a 10-minute signed URL. Everyone else: 404. */
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const path = await findMediaPathForMember(z.uuid().parse(params.id), user.id);
  if (!path || !storageConfigured()) throw notFound();
  return NextResponse.redirect(await signedUrl(path, 600), {
    status: 302,
    headers: { "cache-control": "private, max-age=300" },
  });
});
