import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db/queries/health";
import { log } from "@/lib/log";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  // CLI deploys can carry stale git metadata, so report the deployment id instead of a commit sha.
  const deployment = process.env.VERCEL_DEPLOYMENT_ID?.replace(/^dpl_/, "").slice(0, 8);
  const version = deployment ? `${pkg.version}+${deployment}` : pkg.version;
  try {
    await pingDb();
    return NextResponse.json({ ok: true, db: "ok", version });
  } catch (err) {
    log.error("health check failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, db: "error", version }, { status: 503 });
  }
}
