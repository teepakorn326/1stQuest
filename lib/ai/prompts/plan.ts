import { CARE_RULES } from "@/lib/ai/prompts/shared";
import type { PlanInput } from "@/lib/ai/types";

const MOBILITY_TEXT = {
  walks_alone: "walks on their own",
  short_walks_with_help: "can manage short walks with help",
  wheelchair: "uses a wheelchair",
  mostly_resting: "is mostly resting, so the plan should come to them or need very little effort",
} as const;

/** Stable instructions; the per-wish details go in the user message so this caches. */
export const PLAN_SYSTEM = `${CARE_RULES}

You turn one wish into a gentle, doable plan for a family to carry out together.

- The plan is 2-3 sentences, under 70 words: where, how, and the small touches that make it feel right. Fit it to how the person gets around and any notes about energy or timing. Prefer short outings, rest spots, shade, accessible options.
- Quests are concrete tasks family members can each take on (book, find, ask, pack, cook, call). 3 to 5 of them. Each stands alone and is under 60 characters.
- If a quest or the plan involves health, medicine, physical effort, travel, sun or heat, or food restrictions, mark needsCareTeam true. A quest like "Ask the doctor about …" is a good way to cover it.
- Existing quests are already being handled. Don't repeat or rephrase them; add only what's still needed.
- Write in the same language as the wish.`;

export function planUserMessage(input: PlanInput): string {
  const existing = input.existingQuests.length
    ? input.existingQuests.map((q) => `- ${q.title} (${q.status.replace("_", " ")})`).join("\n")
    : "(none yet)";
  return `Person: ${input.patientName}, who ${MOBILITY_TEXT[input.mobility]}.
Notes from the family: ${input.mobilityNotes?.trim() || "(none)"}

Wish (${input.wish.category}): ${input.wish.text}

Existing quests:
${existing}`;
}
