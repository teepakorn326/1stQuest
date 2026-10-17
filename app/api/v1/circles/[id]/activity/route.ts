import { NextResponse } from "next/server";
import { z } from "zod";
import { route, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { FEED_FILTERS, listActivity, type FeedFilter } from "@/lib/db/queries/activity";

const Query = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  filter: z.enum(Object.keys(FEED_FILTERS) as [FeedFilter, ...FeedFilter[]]).default("all"),
});

/** Older feed items: GET ?before=<ISO created_at of the oldest shown>&filter=all|quests|cards|wishes */
export const GET = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const q = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const items = await listActivity(circle.id, user.id, {
    before: q.before ? new Date(q.before) : undefined,
    filter: q.filter === "all" ? undefined : q.filter,
  });
  return NextResponse.json({ items });
});
