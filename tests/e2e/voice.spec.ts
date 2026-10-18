// Voice note end to end in real Chromium with a fake microphone: record 3 s on a card, save it,
// then check the stored file is WAV and plays for ~3 s. Uses the smoke owner's newest card, so
// run `pnpm smoke` (demo-loop) at least once against the same deployment first, or set VOICE_EMAIL
// to an owner who has a card (locally: VOICE_EMAIL=ploy@wishcircle.demo).
import { expect, test } from "@playwright/test";

test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

test("record a voice note on a card, save it, and play it back", async ({ page }) => {
  await page.goto("/sign-in?next=/book");
  await page.getByLabel("Email").fill(process.env.VOICE_EMAIL ?? "smoke-owner@wishcircle.test");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await page.getByLabel("Code").fill((await page.getByTestId("dev-code").innerText()).trim());
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/book");

  await page.getByTestId("book-card").first().click();
  await page.waitForURL(/\/cards\//);
  const recordings = page.getByTestId("recording");
  const before = await recordings.count();

  await page.getByRole("button", { name: "Voice note", exact: true }).click();
  await page.getByTestId("voice-record").click();
  await expect(page.getByTestId("recording-live")).toBeVisible();
  await page.waitForTimeout(3200);
  await page.getByTestId("voice-stop").click();

  await expect(recordings).toHaveCount(before + 1, { timeout: 30_000 });
  const added = recordings.nth(before);
  await expect(added).toContainText(/0:0[34]/);

  const src = await added.locator("audio").getAttribute("src");
  expect(src).toBeTruthy();
  const res = await page.request.get(src!);
  expect(res.headers()["content-type"]).toContain("audio/wav");
  const duration = await page.evaluate(async (url) => {
    const a = new Audio(url);
    await new Promise((ok, fail) => {
      a.onloadedmetadata = ok;
      a.onerror = () => fail(new Error("audio failed to load"));
    });
    return a.duration;
  }, src!);
  expect(duration).toBeGreaterThan(2.5);
  expect(duration).toBeLessThan(4.5);
});
