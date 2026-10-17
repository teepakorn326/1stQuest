import { z } from "zod";
import { CATEGORIES, type Category } from "@/lib/db/types";

export const WishInput = z
  .object({
    text: z.string().trim().min(1, "What would you love to do?").max(500),
    category: z.enum(CATEGORIES as [Category, ...Category[]]),
    visibility: z.enum(["circle", "chosen", "private"]),
    viewerIds: z.array(z.uuid()).max(50).default([]),
  })
  .refine((w) => w.visibility !== "chosen" || w.viewerIds.length > 0, {
    path: ["viewerIds"],
    message: "Choose at least one person, or pick another option.",
  });
