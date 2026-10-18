import { NextResponse } from "next/server";
import { z } from "zod";
import { conflict, readBody, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { setPhone } from "@/lib/db/queries/notifications";

const Body = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s().-]/g, ""))
    .refine((v) => v === "" || /^\+[1-9]\d{7,14}$/.test(v), "That number doesn’t look right. Check the number and the country.")
    .transform((v) => v || null),
  optIn: z.boolean(),
});

/** Your mobile number (you can sign in with it) and whether to get a text when something new is posted. */
export const PUT = route(async (req) => {
  const user = await requireApiUser();
  const { phone, optIn } = await readBody(req, Body);
  await setPhone(user.id, phone, optIn).catch((err: { code?: string }) => {
    throw err?.code === "23505" ? conflict("That mobile number is already on another account.", "phone_taken") : err;
  });
  return NextResponse.json({ phone, optIn: Boolean(phone) && optIn });
});
