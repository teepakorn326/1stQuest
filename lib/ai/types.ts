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
  plan(input: PlanInput): Promise<PlanOutput>;
  card(input: CardInput): Promise<CardOutput>;
}

export class AiError extends Error {
  constructor(
    public code: "unavailable" | "refused" | "invalid_output" | "not_configured",
    message: string,
  ) {
    super(message);
  }
}

export const PlanSchema = z.object({
  plan: z.string().describe("2-3 warm, practical sentences describing how the wish could happen, fitted to how they get around."),
  needsCareTeam: z.boolean().describe("True if anything involves health, medicine, physical effort, travel, sun/heat or food restrictions."),
  careTeamNote: z
    .string()
    .nullable()
    .describe("If needsCareTeam: what to check, as a short phrase that completes 'Check with the care team first …', e.g. 'about the car trip and time in the sun.' Otherwise null."),
  quests: z
    .array(
      z.object({
        title: z.string().describe("One concrete task a family member could take on, imperative, under 60 characters."),
        needsCareTeam: z.boolean(),
      }),
    )
    .describe("3 to 5 new tasks, not repeating existing ones."),
});
export type PlanOutput = z.infer<typeof PlanSchema>;

export type PlanInput = {
  patientName: string;
  mobility: Mobility;
  mobilityNotes: string | null;
  wish: { text: string; category: Category };
  existingQuests: { title: string; status: string }[];
};

export const CardSchema = z.object({
  title: z.string().describe("A short, specific title from the moment itself, under 50 characters. No quotation marks."),
  body: z.string().describe("2-3 warm sentences, under 60 words, describing what happened, told like a page in a family book."),
  place: z.string().nullable().describe("Where it happened, in one or two words (e.g. 'Bondi', 'Home'), or null if unknown."),
});
export type CardOutput = z.infer<typeof CardSchema>;

export type CardInput = {
  patientName: string;
  authorName: string;
  wish: { text: string; category: Category } | null;
  story: string;
  /** Base64 JPEGs, already downsized. */
  images: string[];
  /** Set when retrying because the first draft used a word the app avoids. */
  avoid?: string[];
  /** Memorial mode: the family is remembering the person. */
  remembrance?: boolean;
};
