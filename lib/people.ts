import { z } from "zod";
import { badRequest, conflict, type HttpError } from "@/lib/http";
import { PersonError } from "@/lib/db/queries/people";

/** Optional mobile number in E.164 ("+66812345678"); "" or missing → null. */
export const Phone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/[\s-]/g, "") : null))
  .refine((v) => v === null || /^\+[1-9]\d{7,14}$/.test(v), "That number doesn’t look right. Check the number and the country.");

/** User-facing errors for adding a person. */
export function personError(err: unknown): HttpError | null {
  if (!(err instanceof PersonError)) return null;
  switch (err.reason) {
    case "phone_taken":
      return conflict("That mobile number is already on someone else’s account.", "phone_taken");
    case "already_member":
      return conflict("They’re already in this circle.", "already_member");
    case "is_you":
      return badRequest("Use their own email, not yours.");
    case "not_found":
      return badRequest("We couldn’t find them.");
  }
}
