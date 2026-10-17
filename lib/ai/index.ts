import "server-only";
import { AnthropicProvider } from "@/lib/ai/anthropic";
import { MockAiProvider } from "@/lib/ai/mock";
import { AiError, type AiProvider } from "@/lib/ai/types";

let provider: AiProvider | null = null;

export function ai(): AiProvider {
  if (provider) return provider;
  if (process.env.AI_PROVIDER === "mock") return (provider = new MockAiProvider());
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("not_configured", "ANTHROPIC_API_KEY is not set");
  return (provider = new AnthropicProvider(key));
}

export { AiError } from "@/lib/ai/types";
