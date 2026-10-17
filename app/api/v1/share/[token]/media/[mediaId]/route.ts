import { NextResponse } from "next/server";
import { z } from "zod";
import { route, notFound } from "@/lib/http";
import { findSharedMediaPath } from "@/lib/db/queries/cards";
import { signedUrl, storageConfigured } from "@/lib/storage";

/** Public: a photo or recording on a shared card → 302 to a 10-minute signed URL. Nothing else. */
export const GET = route<{ token: string; mediaId: string }>(async (_req, { params }) => {
  const token = z.string().min(10).max(64).parse(params.token);
  const path = await findSharedMediaPath(token, z.uuid().parse(params.mediaId));
  if (!path || !storageConfigured()) throw notFound();
  return NextResponse.redirect(await signedUrl(path, 600), { status: 302, headers: { "cache-control": "private, max-age=300" } });
});
