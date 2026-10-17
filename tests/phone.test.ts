import { describe, expect, it } from "vitest";
import { COUNTRIES, fromE164, guessCountry, toE164 } from "@/lib/phone";

const by = (code: string) => COUNTRIES.find((c) => c.code === code)!;

describe("phone numbers", () => {
  it("turns a local number into E.164, dropping spaces and the leading 0", () => {
    expect(toE164(by("TH"), "081 234 5678")).toBe("+66812345678");
    expect(toE164(by("AU"), "0412-345-678")).toBe("+61412345678");
    expect(toE164(by("TH"), "812345678")).toBe("+66812345678");
    expect(toE164(by("TH"), "+66 81 234 5678")).toBe("+66812345678"); // pasted with the code
    expect(toE164(by("TH"), "  ")).toBe("");
  });

  it("splits a saved number back into country and local part", () => {
    expect(fromE164("+66812345678", by("AU"))).toEqual({ country: by("TH"), local: "812345678" });
    expect(fromE164("+85291234567", by("TH")).country.code).toBe("HK");
    expect(fromE164(null, by("AU"))).toEqual({ country: by("AU"), local: "" });
  });

  it("guesses the country from the time zone, Thailand otherwise", () => {
    expect(guessCountry("Australia/Sydney").code).toBe("AU");
    expect(guessCountry("Asia/Bangkok").code).toBe("TH");
    expect(guessCountry("Africa/Cairo").code).toBe("TH");
  });
});
