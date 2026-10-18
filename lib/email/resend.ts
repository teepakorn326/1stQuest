import { Resend } from "resend";
import type { CodeEmail, EmailSender, SignInEmail } from "@/lib/email";

export class ResendEmailSender implements EmailSender {
  readonly delivers = true;
  private client: Resend;
  constructor(
    apiKey: string,
    private from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async sendSignIn({ to, url }: SignInEmail): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject: "Your 1stQuest sign-in link",
      text: `Tap to sign in to 1stQuest:\n\n${url}\n\nThis link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:17px;color:#33261A;line-height:1.5">
        <p>Tap to sign in to 1stQuest:</p>
        <p><a href="${url}" style="display:inline-block;background:#A86400;color:#fff;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:700">Sign in</a></p>
        <p style="color:#7A6650;font-size:15px">This link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>
      </div>`,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  }

  async sendCode({ to, code }: CodeEmail): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject: `${code} is your 1stQuest code`,
      text: `Your 1stQuest sign-in code is ${code}\n\nIt works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:17px;color:#33261A;line-height:1.5">
        <p>Your 1stQuest sign-in code is</p>
        <p style="font-size:34px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p>
        <p style="color:#7A6650;font-size:15px">It works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
      </div>`,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  }
}
