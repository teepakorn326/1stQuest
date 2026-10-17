import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { endSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";

export const POST = route(async () => {
  await endSession();
  return NextResponse.redirect(`${appUrl()}/sign-in`, { status: 303 });
});
