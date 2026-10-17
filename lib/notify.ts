import "server-only";
import { after } from "next/server";
import { appUrl } from "@/lib/env";
import type { NotifyKind, SmsRecipient } from "@/lib/db/queries/notifications";
import { sendTexts } from "@/lib/sms";

export const NOTIFY_VERB: Record<NotifyKind, string> = {
  wish: "added a wish",
  plan: "made a plan for",
  card: "made a new card",
  memory: "shared a memory",
  media: "added to the card",
  memorial_asked: "asked to turn the book into a memorial album",
  memorial_confirmed: "confirmed the memorial album",
  memorial_switched: "turned the book into a memorial album",
  memorial_cancelled: "cancelled the memorial album",
};

/** Text message for an owner post, e.g. "1stQuest: Ploy made a new card in Nana Rose’s circle: “…” https://…/cards/…" */
export function textFor(n: { kind: NotifyKind; actorName: string; patientName: string; title: string; path: string }): string {
  const title = n.title.length > 80 ? `${n.title.slice(0, 77)}…` : n.title;
  return `1stQuest: ${n.actorName} ${NOTIFY_VERB[n.kind]} in ${n.patientName}’s circle: “${title}” ${appUrl()}${n.path}`;
}

/** Sends the texts after the response has gone out, so the owner never waits on SMS. */
export function queueTexts(recipients: SmsRecipient[] | undefined, body: string): void {
  if (!recipients?.length) return;
  after(() => sendTexts(recipients, body));
}
