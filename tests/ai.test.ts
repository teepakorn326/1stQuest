import { describe, expect, it } from "vitest";
import { toApiMessages } from "@/lib/ai/anthropic";
import { MockAiProvider } from "@/lib/ai/mock";
import { talkOpener, talkSystemPrompt } from "@/lib/ai/prompts/talk";
import { TalkTurnSchema } from "@/lib/ai/types";
import { lintText } from "@/lib/copyLint";
import { WishInput } from "@/lib/validation";

describe("talk prompt", () => {
  const prompt = talkSystemPrompt({ patientName: "Rose", speakerIsPatient: false, mobility: "wheelchair" });

  it("carries the care rules and mobility", () => {
    expect(prompt).toMatch(/Never mention time limits, prognosis/);
    expect(prompt).toMatch(/check with the care team first/);
    expect(prompt).toMatch(/same language the user writes in/);
    expect(prompt).toMatch(/Rose uses a wheelchair/);
  });

  it("openers pass the copy lint", () => {
    expect(lintText(talkOpener("Rose", true))).toHaveLength(0);
    expect(lintText(talkOpener("Rose", false))).toHaveLength(0);
  });
});

describe("toApiMessages", () => {
  it("starts with a user turn when the stored conversation opens with the assistant", () => {
    const msgs = toApiMessages([
      { role: "assistant", content: "Q?" },
      { role: "user", content: "A" },
    ]);
    expect(msgs[0]?.role).toBe("user");
    expect(msgs).toHaveLength(3);
  });
});

describe("MockAiProvider", () => {
  it("returns schema-valid turns, suggesting a wish once there's something concrete", async () => {
    const ai = new MockAiProvider();
    const base = { patientName: "Rose", speakerIsPatient: false, mobility: "wheelchair" as const };
    const vague = await ai.talk({ ...base, history: [{ role: "user", content: "Hmm" }] });
    const concrete = await ai.talk({ ...base, history: [{ role: "user", content: "Fish and chips at Palm Beach." }] });
    expect(TalkTurnSchema.parse(vague).suggestion).toBeNull();
    expect(TalkTurnSchema.parse(concrete).suggestion?.text).toBe("Fish and chips at Palm Beach");
  });
});

describe("WishInput", () => {
  it("requires at least one chosen viewer for 'only people I choose'", () => {
    expect(WishInput.safeParse({ text: "x", category: "places", visibility: "chosen", viewerIds: [] }).success).toBe(false);
    expect(WishInput.safeParse({ text: "x", category: "places", visibility: "private" }).success).toBe(true);
    expect(WishInput.safeParse({ text: " ", category: "places", visibility: "circle" }).success).toBe(false);
  });
});
