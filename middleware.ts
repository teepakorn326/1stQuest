import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, unsign } from "@/lib/auth/cookie";

// Cheap edge gate: is there a validly signed session cookie? The DB check happens server-side.
export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const ok = secret ? await unsign(req.cookies.get(SESSION_COOKIE)?.value, secret) : null;
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/home/:path*", "/wishes/:path*", "/book/:path*", "/circle/:path*", "/circles/:path*", "/welcome"],
};
