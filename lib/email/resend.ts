import { Resend } from "resend";
import type { EmailSender, SignInEmail } from "@/lib/email";

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
      subject: "Your Wish Circle sign-in link",
      text: `Tap to sign in to Wish Circle:\n\n${url}\n\nThis link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:17px;color:#1C2B3A;line-height:1.5">
        <p>Tap to sign in to Wish Circle:</p>
        <p><a href="${url}" style="display:inline-block;background:#2F6FA3;color:#fff;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:700">Sign in</a></p>
        <p style="color:#5A6B7B;font-size:15px">This link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>
      </div>`,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  }
}
