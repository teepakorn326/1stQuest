import "server-only";
import { env } from "@/lib/env";
import { DevEmailSender } from "@/lib/email/dev";
import { ResendEmailSender } from "@/lib/email/resend";

export type SignInEmail = { to: string; url: string };
export type CodeEmail = { to: string; code: string };

export interface EmailSender {
  /** `true` when the link is delivered by email; `false` when the caller must show it on screen. */
  readonly delivers: boolean;
  sendSignIn(msg: SignInEmail): Promise<void>;
  sendCode(msg: CodeEmail): Promise<void>;
}

export function isDevEmailMode(): boolean {
  return !env().EMAIL_FROM || !env().RESEND_API_KEY;
}

export function emailSender(): EmailSender {
  const e = env();
  if (!e.EMAIL_FROM || !e.RESEND_API_KEY) return new DevEmailSender();
  return new ResendEmailSender(e.RESEND_API_KEY, e.EMAIL_FROM);
}
