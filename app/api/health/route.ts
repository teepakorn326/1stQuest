import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db/queries/health";
import { log } from "@/lib/log";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? pkg.version;
  try {
    await pingDb();
    return NextResponse.json({ ok: true, db: "ok", version });
  } catch (err) {
    log.error("health check failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, db: "error", version }, { status: 503 });
  }
}
