// Email and mobile-number checks shared by the browser and the API, so both say the same thing.
// Mobile numbers are checked per country with libphonenumber-js's mobile metadata (a Thai mobile has
// 9 digits after +66 and starts with 6, 8 or 9; an Australian one starts with 4; and so on).
import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

export const EMAIL_MESSAGE = "That email doesn’t look right. Check it, e.g. name@example.com.";
export const PHONE_MESSAGE = "That isn’t a mobile number for the country you picked. Check the number and the country.";

export function emailProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter an email address.";
  if (v.length > 254 || !EMAIL_RE.test(v)) return EMAIL_MESSAGE;
  return null;
}

/** "+66 81 234 5678" → "+66812345678" when it's a real mobile number, else null. */
export function normalizeMobile(value: string): string | null {
  const v = value.trim();
  if (!v.startsWith("+")) return null;
  const n = parsePhoneNumberFromString(v);
  return n && n.isValid() ? n.number : null;
}

/** null when fine (or empty and optional). */
export function phoneProblem(e164: string, { required = false } = {}): string | null {
  if (!e164.trim()) return required ? "Enter your mobile number." : null;
  return normalizeMobile(e164) ? null : PHONE_MESSAGE;
}
