import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { updateUserName } from "@/lib/db/queries/users";

const Body = z.object({ name: z.string().trim().min(1, "Please add your name.").max(60) });

export const PATCH = route(async (req) => {
  const user = await requireApiUser();
  const { name } = await readBody(req, Body);
  await updateUserName(user.id, name);
  return NextResponse.json({ ok: true });
});
