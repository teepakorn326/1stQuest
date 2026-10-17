import { NextResponse } from "next/server";
import { z } from "zod";
import { route, conflict, forbidden, notFound, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canPost, canSeeWish, POST_FORBIDDEN } from "@/lib/authz";
import { ai, AiError } from "@/lib/ai";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { findLatestPlan, findWishForMember, savePlan } from "@/lib/db/queries/wishes";
import { queueTexts, textFor } from "@/lib/notify";

export const maxDuration = 60;

/** Make (or update) the plan for a wish. The wish is never touched if the AI call fails. */
export const POST = route<{ id: string }>(async (_req, { params, log }) => {
  const user = await requireApiUser();
  const wish = await findWishForMember(z.uuid().parse(params.id), user.id);
  const viewer = { userId: user.id, role: wish?.viewer_role ?? null };
  if (!wish || !canSeeWish(viewer, wish, wish.viewer_ids)) throw notFound();
  if (!canPost(viewer)) throw forbidden(POST_FORBIDDEN);
  if (wish.done) throw conflict("This wish is done: every quest is complete, so its plan and words stay as they are.", "wish_done");

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
    queueTexts(plan.sms, textFor({ kind: "plan", actorName: user.name ?? "The owner", patientName: circle.patient_name, title: wish.text, path: `/wishes/${wish.id}` }));
    return NextResponse.json({ plan: { id: plan.id } }, { status: 201 });
  } catch (err) {
    if (err instanceof AiError) {
      log.warn("plan failed", { code: err.code, wishId: wish.id });
      throw new HttpError(503, `ai_${err.code}`, "We couldn’t make a plan just now. Your wish is safe; try again in a moment.");
    }
    throw err;
  }
});
