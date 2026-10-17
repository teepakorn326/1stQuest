import { describe, expect, it } from "vitest";
import { sign, unsign } from "@/lib/auth/cookie";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/tokens";

const SECRET = "a".repeat(40);

describe("signed cookies", () => {
  it("round-trips a value", async () => {
    expect(await unsign(await sign("abc-123", SECRET), SECRET)).toBe("abc-123");
  });

  it("rejects a tampered value or signature", async () => {
    const signed = await sign("abc-123", SECRET);
    expect(await unsign(signed.replace("abc", "abd"), SECRET)).toBeNull();
    expect(await unsign(`${signed}x`, SECRET)).toBeNull();
    expect(await unsign("abc-123", SECRET)).toBeNull();
  });

  it("rejects a value signed with another secret", async () => {
    expect(await unsign(await sign("abc", "b".repeat(40)), SECRET)).toBeNull();
  });
});

describe("passwords", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("allows same-origin paths only", () => {
    expect(safeNextPath("/join/abc")).toBe("/join/abc");
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
