import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, badRequest, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { addTribute } from "@/lib/db/queries/tributes";

const Body = z.object({
  kind: z.enum(["candle", "flower"]),
  message: z.string().trim().max(300).optional().transform((v) => v || null),
});

/** Anyone in a memorial circle lights a candle or leaves a flower (with a few words if they like). */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  if (circle.mode !== "memorial") throw badRequest("Candles and flowers are for memorial albums.");
  const { kind, message } = await readBody(req, Body);
  const added = await addTribute({ circleId: circle.id, userId: user.id, kind, message });
  return NextResponse.json({ added }, { status: added ? 201 : 200 });
});
