import { NextResponse } from "next/server";
import { z } from "zod";
import { route, forbidden, notFound, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canSeeWish } from "@/lib/authz";
import { ai, AiError } from "@/lib/ai";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { findLatestPlan, findWishForMember, savePlan } from "@/lib/db/queries/wishes";

export const maxDuration = 60;

/** Make (or update) the plan for a wish. The wish is never touched if the AI call fails. */
export const POST = route<{ id: string }>(async (_req, { params, log }) => {
  const user = await requireApiUser();
  const wish = await findWishForMember(z.uuid().parse(params.id), user.id);
  const viewer = { userId: user.id, role: wish?.viewer_role ?? null };
  if (!wish || !canSeeWish(viewer, wish, wish.viewer_ids)) throw notFound();
  if (wish.author_id !== user.id && viewer.role === "doctor") throw forbidden("The family makes plans; you can leave notes on them.");

  const [circle, current] = await Promise.all([findCircleForMember(wish.circle_id, user.id), findLatestPlan(wish.id)]);
  if (!circle) throw notFound();

  try {
    const output = await ai().plan({
      patientName: circle.patient_name,
      mobility: circle.mobility,
      mobilityNotes: circle.mobility_notes,
      wish: { text: wish.text, category: wish.category },
      existingQuests: (current?.quests ?? []).map((q) => ({ title: q.title, status: q.status })),
    });
    const plan = await savePlan({ wish, actorId: user.id, mobility: circle.mobility, output });
    return NextResponse.json({ plan: { id: plan.id } }, { status: 201 });
  } catch (err) {
    if (err instanceof AiError) {
      log.warn("plan failed", { code: err.code, wishId: wish.id });
      throw new HttpError(503, `ai_${err.code}`, "We couldn’t make a plan just now. Your wish is safe; try again in a moment.");
    }
    throw err;
  }
});
