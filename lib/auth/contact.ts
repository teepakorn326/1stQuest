import { z } from "zod";
import { Email, Mobile } from "@/lib/fields";

/** Sign in with an email address or a mobile number (checked per country, sent as E.164). */
export const Contact = z.union([z.object({ email: Email }), z.object({ phone: Mobile })]);
