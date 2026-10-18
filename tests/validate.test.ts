import { describe, expect, it } from "vitest";
import { Email, Mobile, OptionalMobile } from "@/lib/fields";
import { emailProblem, normalizeMobile, phoneProblem } from "@/lib/validate";

describe("email checks", () => {
  it.each(["ploy@example.com", "A.B+tag@sub.example.co.th", " tom@wishcircle.demo "])("accepts %s", (v) => {
    expect(emailProblem(v)).toBeNull();
  });
  it.each(["", "ploy", "ploy@", "ploy@example", "ploy@@example.com", "plo y@example.com", "ploy@example.c", "ploy@.com"])("rejects %j", (v) => {
    expect(emailProblem(v)).not.toBeNull();
  });
  it("the API lower-cases and trims", () => {
    expect(Email.parse("  Ploy@Example.COM ")).toBe("ploy@example.com");
    expect(Email.safeParse("nope").success).toBe(false);
  });
});

describe("mobile number checks (per country)", () => {
  it("accepts real mobile numbers and normalises them", () => {
    expect(normalizeMobile("+66 81 234 5678")).toBe("+66812345678");
    expect(normalizeMobile("+61 412 345 678")).toBe("+61412345678");
    expect(normalizeMobile("+44 7911 123456")).toBe("+447911123456");
  });
  it("rejects wrong lengths, landlines and missing country codes", () => {
    expect(normalizeMobile("+66 81 234 567")).toBeNull(); // too short for Thailand
    expect(normalizeMobile("+66 2 123 4567")).toBeNull(); // Bangkok landline
    expect(normalizeMobile("+61 2 9999 9999")).toBeNull(); // Sydney landline
    expect(normalizeMobile("0812345678")).toBeNull(); // no country
    expect(normalizeMobile("+66abc")).toBeNull();
  });
  it("optional means empty is fine, required means it isn't", () => {
    expect(phoneProblem("")).toBeNull();
    expect(phoneProblem("", { required: true })).not.toBeNull();
    expect(phoneProblem("+66812345678")).toBeNull();
  });
  it("the API normalises or refuses", () => {
    expect(Mobile.parse("+66 81-234-5678")).toBe("+66812345678");
    expect(Mobile.safeParse("+6681").success).toBe(false);
    expect(OptionalMobile.parse("")).toBeNull();
    expect(OptionalMobile.parse(undefined)).toBeNull();
    expect(OptionalMobile.safeParse("+61 2 9999 9999").success).toBe(false);
  });
});
