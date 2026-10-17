import "server-only";
import { log } from "@/lib/log";

export interface SmsSender {
  /** `true` when texts really go out; `false` in dev mode (logged only). */
  readonly delivers: boolean;
  send(to: string, body: string): Promise<void>;
}

/** No ClickSend credentials: log instead of sending, like dev-mode email. */
class DevSmsSender implements SmsSender {
  readonly delivers = false;
  async send(to: string, body: string): Promise<void> {
    log.info("dev sms: not sent (ClickSend not configured)", { to: `${to.slice(0, 4)}…${to.slice(-2)}`, chars: body.length });
  }
}

/** ClickSend REST API v3: POST /v3/sms/send with HTTP basic auth (username + API key). */
class ClickSendSender implements SmsSender {
  readonly delivers = true;
  constructor(
    private username: string,
    private apiKey: string,
    private from: string | undefined,
  ) {}

  async send(to: string, body: string): Promise<void> {
    const res = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${this.username}:${this.apiKey}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ messages: [{ source: "1stquest", to, body, ...(this.from ? { from: this.from } : {}) }] }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { response_code?: string; data?: { messages?: { status?: string }[] } } | null;
    const status = data?.data?.messages?.[0]?.status;
    if (!res.ok || data?.response_code !== "SUCCESS" || (status && status !== "SUCCESS")) {
      throw new Error(`ClickSend: ${res.status} ${data?.response_code ?? ""} ${status ?? ""}`.trim());
    }
  }
}

let sender: SmsSender | null = null;

export function smsSender(): SmsSender {
  if (sender) return sender;
  const { CLICKSEND_USERNAME: u, CLICKSEND_API_KEY: k, CLICKSEND_FROM: from } = process.env;
  sender = u && k ? new ClickSendSender(u, k, from || undefined) : new DevSmsSender();
  return sender;
}

/** Best-effort fan-out after the post is saved; one failed number never affects the others. */
export async function sendTexts(recipients: { phone: string }[], body: string): Promise<void> {
  const s = smsSender();
  await Promise.all(
    recipients.map((r) =>
      s.send(r.phone, body).catch((err: unknown) => log.warn("sms failed", { error: err instanceof Error ? err.message : String(err) })),
    ),
  );
}
