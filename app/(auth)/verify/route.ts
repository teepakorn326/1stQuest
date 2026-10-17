import { NextResponse, type NextRequest } from "next/server";
import { redeemMagicLink } from "@/lib/auth/magicLink";
import { startSession } from "@/lib/auth/session";
import { upsertUserByEmail } from "@/lib/db/queries/users";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const base = appUrl();
  if (!token) return NextResponse.redirect(`${base}/sign-in?error=link`);
  try {
    const link = await redeemMagicLink(token);
    if (!link) return NextResponse.redirect(`${base}/sign-in?error=link`);
    const user = await upsertUserByEmail(link.email);
    await startSession(user.id);
    const dest = link.next_path ?? "/home";
    // First sign-in: ask for a name (one field) before continuing.
    return NextResponse.redirect(user.name ? `${base}${dest}` : `${base}/welcome?next=${encodeURIComponent(dest)}`);
  } catch (err) {
    log.error("verify failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.redirect(`${base}/sign-in?error=server`);
  }
}
