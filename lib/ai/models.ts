// Model choice per task. Chat is short and frequent → Haiku; plans and cards → Sonnet.
export const CHAT_MODEL = "claude-haiku-5-5";
export const PLAN_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
