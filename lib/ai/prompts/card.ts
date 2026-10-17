import { CARE_RULES } from "@/lib/ai/prompts/shared";
import type { CardInput } from "@/lib/ai/types";

export const CARD_SYSTEM = `${CARE_RULES}

You write memory cards for a family book. A card has a title and a short body about one moment the family shared.

- Use the family's story as the source of truth. The photos add detail (who, where, small touches) but never invent names or events that aren't in the story or clearly visible.
- Title: specific and warm, from the moment itself (e.g. "The wind took Nana's hat"), under 50 characters.
- Body: 2-3 sentences, under 60 words, past tense, like a page someone will reread years from now. Gentle, never sad or clinical. No exclamation marks.
- Write in the same language as the story.`;

export function cardUserText(input: CardInput): string {
  const lines = [
    input.remembrance
      ? `The family is remembering ${input.patientName}, who has died. Write it as a remembrance: warm, grateful, past tense, about who they were and what they gave. Not mournful, and no clichés about loss.`
      : `The card is about ${input.patientName}.`,
    input.wish ? `It came from the wish (${input.wish.category}): ${input.wish.text}` : "It is a shared memory.",
    `${input.authorName}'s story: ${input.story.trim() || "(no words, only photos)"}`,
    `${input.images.length} photo(s) attached.`,
  ];
  if (input.avoid?.length) lines.push(`Do not use these words: ${input.avoid.join(", ")}.`);
  return lines.join("\n");
}
