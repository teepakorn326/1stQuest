import type { EmailSender, SignInEmail } from "@/lib/email";
import { log } from "@/lib/log";

/** No email provider configured: the API hands the link back and the UI shows it under a dev banner. */
export class DevEmailSender implements EmailSender {
  readonly delivers = false;
  async sendSignIn(msg: SignInEmail): Promise<void> {
    log.info("dev email: sign-in link returned to client", { to: msg.to });
  }
}
