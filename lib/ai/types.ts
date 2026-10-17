import { z } from "zod";
import { CATEGORIES, type Category, type Mobility } from "@/lib/db/types";

export const TalkTurnSchema = z.object({
  reply: z.string().describe("Your next message to the person: warm, one gentle open question at most."),
  suggestion: z
    .object({
      text: z.string().describe("The wish in their words, under 90 characters, starting with a verb or a noun phrase."),
      category: z.enum(CATEGORIES as [Category, ...Category[]]),
    })
    .nullable()
    .describe("A wish you heard in what they said, or null if nothing concrete yet."),
});
export type TalkTurn = z.infer<typeof TalkTurnSchema>;

export type TalkInput = {
  patientName: string;
  speakerIsPatient: boolean;
  mobility: Mobility;
  history: { role: "user" | "assistant"; content: string }[];
};

export interface AiProvider {
  talk(input: TalkInput): Promise<TalkTurn>;
}

export class AiError extends Error {
  constructor(
    public code: "unavailable" | "refused" | "invalid_output" | "not_configured",
    message: string,
  ) {
    super(message);
  }
}
