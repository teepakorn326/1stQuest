import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, HttpError, notFound } from "@/lib/http";
import { addGuestMessage } from "@/lib/db/queries/cards";
import { env } from "@/lib/env";

const Body = z.object({
  name: z.string().trim().min(1, "Add your name.").max(60, "That name is a bit long."),
  text: z.string().trim().min(1, "Write a message.").max(500, "Keep it under 500 characters."),
  /** Hidden field: people never fill it in, simple bots do. */
  website: z.string().optional(),
});

/** Anyone with a card's share link can leave a comment with their name (no account needed). */
export const POST = route<{ token: string }>(async (req, { params, log }) => {
  if (!/^[\w-]{10,64}$/.test(params.token)) throw notFound("This link no longer works.");
  const { name, text, website } = await readBody(req, Body);
  if (website) return NextResponse.json({ ok: true }, { status: 201 }); // quietly drop bot posts
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const key = createHmac("sha256", env().SESSION_SECRET).update(`${ip}|${params.token}`).digest("hex");
  const added = await addGuestMessage(params.token, { name, text, key });
  if (added === null) throw notFound("This link no longer works.");
  if (added === "rate_limited") throw new HttpError(429, "rate_limited", "You’ve left a few messages already. Please try again in a few minutes.");
  log.info("guest comment", { levelledUp: added.levelledUp });
  return NextResponse.json({ ok: true, levelledUp: added.levelledUp }, { status: 201 });
});
