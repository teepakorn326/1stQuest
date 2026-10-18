import { badRequest, conflict, type HttpError } from "@/lib/http";
import { PersonError } from "@/lib/db/queries/people";

export { OptionalMobile as Phone } from "@/lib/fields";

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
