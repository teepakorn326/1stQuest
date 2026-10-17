import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { log } from "@/lib/log";
import { CHAT_MODEL } from "@/lib/ai/models";
import { talkSystemPrompt } from "@/lib/ai/prompts/talk";
import { AiError, TalkTurnSchema, type AiProvider, type TalkInput, type TalkTurn } from "@/lib/ai/types";

const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryable(err: unknown): boolean {
  return (
    err instanceof Anthropic.RateLimitError ||
    err instanceof Anthropic.InternalServerError ||
    err instanceof Anthropic.APIConnectionError || // includes timeouts
    (err instanceof Anthropic.APIError && (err.status === 529 || err.status === 408 || err.status === 409))
  );
}

/** Runs `fn` with exponential backoff on transient errors; logs every attempt. */
async function withRetry<T>(task: string, model: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const willRetry = attempt < ATTEMPTS && retryable(err);
      log.warn("ai call failed", {
        task,
        model,
        attempt,
        willRetry,
        error: err instanceof Error ? err.message : String(err),
        status: err instanceof Anthropic.APIError ? err.status : undefined,
      });
      if (!willRetry) break;
      await sleep(400 * 2 ** (attempt - 1) + Math.random() * 200);
    }
  }
  throw new AiError("unavailable", lastErr instanceof Error ? lastErr.message : "AI call failed");
}

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    // Retries are ours (withRetry) so each attempt gets logged; the SDK's are off.
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
  }

  async talk(input: TalkInput): Promise<TalkTurn> {
    const started = Date.now();
    const res = await withRetry("talk", CHAT_MODEL, () =>
      this.client.messages.parse({
        model: CHAT_MODEL,
        max_tokens: 2000,
        output_config: { effort: "low", format: zodOutputFormat(TalkTurnSchema) },
        system: [{ type: "text", text: talkSystemPrompt(input), cache_control: { type: "ephemeral" } }],
        messages: toApiMessages(input.history),
      }),
    );
    log.info("ai call", {
      task: "talk",
      model: res.model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
      ms: Date.now() - started,
      stopReason: res.stop_reason,
    });
    if (res.stop_reason === "refusal") throw new AiError("refused", "The model declined this turn.");
    if (!res.parsed_output) throw new AiError("invalid_output", `Unparseable output (stop: ${res.stop_reason})`);
    return res.parsed_output;
  }
}

/** The API needs a user turn first; our stored conversation opens with an assistant question. */
export function toApiMessages(history: TalkInput["history"]): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  if (msgs[0]?.role === "assistant") msgs.unshift({ role: "user", content: "Hello." });
  return msgs;
}
