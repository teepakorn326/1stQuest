import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, conflict, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { canSeeWish } from "@/lib/authz";
import { questTransition } from "@/lib/quests";
import { findQuestForMember, moveQuest } from "@/lib/db/queries/quests";

const Body = z.object({ action: z.enum(["claim", "release", "done"]) });

const REASON = {
  locked: "Share this wish to let others help.",
  not_allowed: "Only the person who took this quest can do that.",
  wrong_state: "This quest has changed. Pull to refresh.",
} as const;

/** "I'll take this", "Let someone else take it", "Mark done". */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const quest = await findQuestForMember(z.uuid().parse(params.id), user.id);
  const viewer = { userId: user.id, role: quest?.viewer_role ?? null };
  const wish = quest && { author_id: quest.wish_author_id, visibility: quest.wish_visibility };
  if (!quest || !wish || !canSeeWish(viewer, wish, quest.viewer_ids)) throw notFound();

  const { action } = await readBody(req, Body);
  const t = questTransition(action, quest, wish, viewer, quest.viewer_ids);
  if (!t.ok) throw t.reason === "wrong_state" ? conflict(REASON.wrong_state, "wrong_state") : forbidden(REASON[t.reason]);

  const moved = await moveQuest({ quest, actorId: user.id, from: quest.status, to: t.status, claimedBy: t.claimedBy });
  if (!moved) throw conflict("Someone just took this one.", "already_taken");
  return NextResponse.json({ quest: { id: moved.id, status: moved.status, claimedBy: moved.claimed_by_user_id } });
});
