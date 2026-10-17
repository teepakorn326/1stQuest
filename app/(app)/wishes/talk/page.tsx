import { redirect } from "next/navigation";
import { talkOpener } from "@/lib/ai/prompts/talk";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { ensureConversation, listConversationMessages } from "@/lib/db/queries/conversations";
import { TalkChat } from "./TalkChat";

export const dynamic = "force-dynamic";

export default async function TalkPage() {
  const user = await requirePageUser("/wishes/talk");
  const circle = await getActiveCircle(user.id);
  if (!circle || circle.mode === "memorial" || circle.role !== "owner") redirect("/home");
  const speakerIsPatient = circle.set_up_by_patient && circle.role === "owner";
  const conversationId = await ensureConversation(circle.id, user.id, talkOpener(circle.patient_name, speakerIsPatient));
  const messages = await listConversationMessages(conversationId);

  return (
    <TalkChat
      circleId={circle.id}
      initial={messages.map((m) => ({ id: m.id, role: m.role, content: m.content, suggestion: m.suggestion }))}
    />
  );
}
