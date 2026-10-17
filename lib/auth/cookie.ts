// Edge-safe signed cookie helpers (Web Crypto only), shared by middleware and server code.

export const SESSION_COOKIE = "wc_session";
export const CIRCLE_COOKIE = "wc_circle";

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sign(value: string, secret: string): Promise<string> {
  return `${value}.${await hmac(value, secret)}`;
}

/** Returns the original value if the signature matches, else null. */
export async function unsign(signed: string | undefined | null, secret: string): Promise<string | null> {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  return safeEqual(mac, await hmac(value, secret)) ? value : null;
}
