import { describe, expect, it } from "vitest";
import { lintText } from "@/lib/copyLint";

describe("copy lint", () => {
  it.each([
    "Her last wish",
    "3 remaining wishes",
    "Make a bucket list",
    "Set a deadline",
    "Countdown to the trip",
    "Keep your streak going",
    "2 of 5 quests done",
    "{done} of {total}",
    "${done} of ${total}",
  ])("flags %j", (text) => {
    expect(lintText(text)).not.toHaveLength(0);
  });

  it.each(["Atkinson Hyperlegible", "lastName", "blasting", "Wishes we’re working on", "Made from 4 photos"])("allows %j", (text) => {
    expect(lintText(text)).toHaveLength(0);
  });

  it("honours the ignore marker", () => {
    expect(lintText("const last = 1; // copy-lint-ignore")).toHaveLength(0);
  });
});
