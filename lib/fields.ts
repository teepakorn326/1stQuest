import { z } from "zod";
import { EMAIL_MESSAGE, PHONE_MESSAGE, emailProblem, normalizeMobile } from "@/lib/validate";

/** Lower-cased, trimmed email, checked the same way the browser checks it. */
export const Email = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => emailProblem(v) === null, EMAIL_MESSAGE);

/** A real mobile number for its country, normalised to E.164 ("+66812345678"). */
export const Mobile = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeMobile(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: PHONE_MESSAGE });
      return z.NEVER;
    }
    return n;
  });

/** Optional mobile number: "" or missing → null. */
export const OptionalMobile = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normalizeMobile(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: PHONE_MESSAGE });
      return z.NEVER;
    }
    return n;
  });
