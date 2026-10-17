import type { AiProvider, CardInput, CardOutput, PlanInput, PlanOutput, TalkInput, TalkTurn } from "@/lib/ai/types";

/**
 * Deterministic provider for tests and the Playwright smoke run (AI_PROVIDER=mock).
 * Never selected in production unless that env var is set explicitly.
 */
export class MockAiProvider implements AiProvider {
  calls: { task: string; input: unknown }[] = [];

  async talk(input: TalkInput): Promise<TalkTurn> {
    this.calls.push({ task: "talk", input });
    const said = [...input.history].reverse().find((m) => m.role === "user")?.content ?? "";
    const words = said.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      return {
        reply: "That sounds lovely. What do you remember most about it?",
        suggestion: { text: said.trim().replace(/[.!]+$/, "").slice(0, 90), category: "places" },
      };
    }
    return { reply: "Tell me a little more. Who would be there with you?", suggestion: null };
  }

  async plan(input: PlanInput): Promise<PlanOutput> {
    this.calls.push({ task: "plan", input });
    const have = new Set(input.existingQuests.map((q) => q.title));
    const quests = [
      { title: "Pick a calm morning that suits everyone", needsCareTeam: false },
      { title: "Ask the care team if this plan is okay", needsCareTeam: true },
      { title: "Pack water, a hat and a blanket", needsCareTeam: false },
    ].filter((q) => !have.has(q.title));
    return {
      plan: `A slow, unhurried way to ${input.wish.text.toLowerCase()}, with rest stops along the way.`,
      needsCareTeam: true,
      careTeamNote: "about the outing.",
      quests,
    };
  }

  async card(input: CardInput): Promise<CardOutput> {
    this.calls.push({ task: "card", input });
    const first = input.story.trim().split(/[.!?]/)[0]?.trim() || input.wish?.text || "A day together";
    return {
      title: first.slice(0, 48),
      body: `${input.story.trim() || "A quiet, happy day together."} ${input.patientName} smiled the whole way home.`,
      place: null,
    };
  }
}
