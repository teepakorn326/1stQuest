// Mobile numbers: people pick their country and type the number as they know it ("081 234 5678");
// we store E.164 ("+66812345678"), which is what the API and ClickSend expect.

export type Country = { code: string; dial: string; name: string; tz: string[] };

export const COUNTRIES: Country[] = [
  { code: "TH", dial: "66", name: "Thailand", tz: ["Asia/Bangkok"] },
  { code: "AU", dial: "61", name: "Australia", tz: ["Australia/"] },
  { code: "NZ", dial: "64", name: "New Zealand", tz: ["Pacific/Auckland"] },
  { code: "SG", dial: "65", name: "Singapore", tz: ["Asia/Singapore"] },
  { code: "MY", dial: "60", name: "Malaysia", tz: ["Asia/Kuala_Lumpur"] },
  { code: "VN", dial: "84", name: "Vietnam", tz: ["Asia/Ho_Chi_Minh"] },
  { code: "PH", dial: "63", name: "Philippines", tz: ["Asia/Manila"] },
  { code: "ID", dial: "62", name: "Indonesia", tz: ["Asia/Jakarta"] },
  { code: "HK", dial: "852", name: "Hong Kong", tz: ["Asia/Hong_Kong"] },
  { code: "CN", dial: "86", name: "China", tz: ["Asia/Shanghai"] },
  { code: "JP", dial: "81", name: "Japan", tz: ["Asia/Tokyo"] },
  { code: "KR", dial: "82", name: "South Korea", tz: ["Asia/Seoul"] },
  { code: "IN", dial: "91", name: "India", tz: ["Asia/Kolkata"] },
  { code: "GB", dial: "44", name: "United Kingdom", tz: ["Europe/London"] },
  { code: "US", dial: "1", name: "United States / Canada", tz: ["America/"] },
];

/** The viewer's likely country from their time zone; Thailand when we can't tell. */
export function guessCountry(timeZone?: string): Country {
  const tz = timeZone ?? "";
  return COUNTRIES.find((c) => c.tz.some((t) => tz.startsWith(t))) ?? COUNTRIES[0]!;
}

/** "081 234 5678" in Thailand → "+66812345678". Drops spaces, dashes and the local leading 0. Empty → "". */
export function toE164(country: Country, local: string): string {
  let digits = local.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(country.dial) && digits.length > 9 + country.dial.length - 1) digits = digits.slice(country.dial.length);
  digits = digits.replace(/^0+/, "");
  return `+${country.dial}${digits}`;
}

/** "+66812345678" → Thailand and "812345678" (longest dial code wins, so +852 isn't read as +85…). */
export function fromE164(phone: string | null | undefined, fallback: Country): { country: Country; local: string } {
  if (!phone?.startsWith("+")) return { country: fallback, local: "" };
  const digits = phone.slice(1);
  const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial));
  return match ? { country: match, local: digits.slice(match.dial.length) } : { country: fallback, local: digits };
}
