import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, forbidden, notFound, HttpError } from "@/lib/http";
import { canPost, POST_FORBIDDEN } from "@/lib/authz";
import { requireApiUser } from "@/lib/auth/session";
import { ai, AiError } from "@/lib/ai";
import { talkOpener } from "@/lib/ai/prompts/talk";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { findMembership } from "@/lib/db/queries/memberships";
import { appendTurn, clearConversation, ensureConversation, listConversationMessages } from "@/lib/db/queries/conversations";

export const maxDuration = 60;

const Body = z.object({ text: z.string().trim().min(1).max(2000) });

async function load(id: string, userId: string) {
  const circle = await findCircleForMember(z.uuid().parse(id), userId);
  if (!circle) throw notFound();
  if (!canPost({ userId, role: circle.role })) throw forbidden(POST_FORBIDDEN);
  return circle;
}

/** Send a message; returns the assistant's reply (and a suggested wish, if any). */
export const POST = route<{ id: string }>(async (req, { params, log }) => {
  const user = await requireApiUser();
  const circle = await load(params.id, user.id);
  const { text } = await readBody(req, Body);

  // Owner who set the circle up for themselves is the patient talking.
  const membership = await findMembership(circle.id, user.id);
  const speakerIsPatient = circle.set_up_by_patient && membership?.role === "owner";
  const conversationId = await ensureConversation(circle.id, user.id, talkOpener(circle.patient_name, speakerIsPatient));
  const history = (await listConversationMessages(conversationId, 40)).map((m) => ({ role: m.role, content: m.content }));

  try {
    const turn = await ai().talk({
      patientName: circle.patient_name,
      speakerIsPatient,
      mobility: circle.mobility,
      history: [...history, { role: "user", content: text }],
    });
    const saved = await appendTurn(conversationId, text, { content: turn.reply, suggestion: turn.suggestion });
    return NextResponse.json({ message: { id: saved.id, role: "assistant", content: saved.content, suggestion: saved.suggestion } });
  } catch (err) {
    if (err instanceof AiError) {
      log.warn("talk failed", { code: err.code });
      throw new HttpError(
        err.code === "refused" ? 422 : 503,
        `ai_${err.code}`,
        err.code === "refused"
          ? "I couldn’t answer that one. Could you put it another way?"
          : "I couldn’t reply just now. Your message is still here; try sending it again.",
      );
    }
    throw err;
  }
});

/** Start over. */
export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const circle = await load(params.id, user.id);
  await clearConversation(circle.id, user.id);
  return NextResponse.json({ ok: true });
});
