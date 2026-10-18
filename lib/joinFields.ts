import { z } from "zod";
import { Email, OptionalMobile } from "@/lib/fields";

/** What someone fills in when they register from a circle's link or QR code. */
export const Registration = z.object({
  name: z.string().trim().min(1, "Add your name.").max(60, "That name is a bit long."),
  email: Email,
  phone: OptionalMobile,
  role: z.enum(["viewer", "health"]),
});
