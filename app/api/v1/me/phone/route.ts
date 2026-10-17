import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { setPhone } from "@/lib/db/queries/notifications";

const Body = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s().-]/g, ""))
    .refine((v) => v === "" || /^\+[1-9]\d{7,14}$/.test(v), "Use the international format, starting with + and the country code (e.g. +61 4…, +66 8…).")
    .transform((v) => v || null),
  optIn: z.boolean(),
});

/** Your mobile number and whether to get a text when the owner posts. */
export const PUT = route(async (req) => {
  const user = await requireApiUser();
  const { phone, optIn } = await readBody(req, Body);
  await setPhone(user.id, phone, optIn);
  return NextResponse.json({ phone, optIn: Boolean(phone) && optIn });
});
