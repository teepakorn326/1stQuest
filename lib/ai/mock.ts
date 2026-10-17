import type { AiProvider, TalkInput, TalkTurn } from "@/lib/ai/types";

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
}
