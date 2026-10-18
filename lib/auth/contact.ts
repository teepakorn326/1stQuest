import { z } from "zod";

/** Sign in with an email address or a mobile number (E.164). */
export const Contact = z.union([
  z.object({ email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email.")) }),
  z.object({ phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "That number doesn’t look right. Check the number and the country.") }),
]);
