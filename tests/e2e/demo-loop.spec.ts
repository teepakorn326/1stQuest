// Smoke test of the judged demo loop, against a live deployment with the real AI.
// Each run creates its own circle so the seeded "Nana Rose" demo stays untouched.
// Needs the deployment to be in dev email mode (EMAIL_FROM unset) so the sign-in link is on screen.
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";

const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
const OWNER = { email: "smoke-owner@wishcircle.test", name: "Smoke Owner" };
const JOINER = { email: "smoke-joiner@wishcircle.test", name: "Smoke Joiner" };
const PATIENT = `Smoke ${stamp}`;
const fixture = (f: string) => path.join(__dirname, "fixtures", f);

/** Email → on-screen dev link → (first time) name → wherever `next` pointed. */
async function signIn(page: Page, who: { email: string; name: string }) {
  await page.getByLabel("Email").fill(who.email);
  await page.getByRole("button", { name: "Send me a sign-in link" }).click();
  await page.getByTestId("dev-link").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/verify") && !u.pathname.startsWith("/sign-in"));
  if (new URL(page.url()).pathname === "/welcome") {
    await page.getByLabel("Your name").fill(who.name);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((u) => u.pathname !== "/welcome");
  }
}

async function newPhone(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

test("demo loop: sign in → circle → join by invite → wish → AI plan → live claim → photos → AI card → book", async ({
  browser,
  request,
}) => {
  test.slow();

  await test.step("health check", async () => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    expect(await res.json()).toMatchObject({ ok: true, db: "ok" });
  });

  const owner = await newPhone(browser);
  const joiner = await newPhone(browser);
  let inviteUrl = "";
  let wishUrl = "";

  await test.step("owner signs in and creates a circle", async () => {
    await owner.goto("/sign-in");
    await signIn(owner, OWNER);
    await owner.goto("/circles/new");
    await owner.getByLabel("Who is this circle for?").fill(PATIENT);
    await owner.getByRole("radio", { name: "Uses a wheelchair" }).click();
    await owner.getByLabel("Anything else that helps with planning").fill("Best in the mornings. Tires after 20 minutes.");
    await owner.getByRole("button", { name: "Create circle" }).click();
    await owner.waitForURL("**/circle/invite");
    inviteUrl = await owner.getByTestId("invite-link").inputValue();
    expect(inviteUrl).toMatch(/\/join\/[\w-]+$/);
  });

  await test.step("second person joins from the invite link", async () => {
    await joiner.goto(inviteUrl);
    await expect(joiner.getByText(`invited to ${PATIENT}’s circle`)).toBeVisible();
    await signIn(joiner, JOINER);
    await expect(joiner.getByRole("heading", { name: new RegExp(`(Join|already in) ${PATIENT}’s circle`) })).toBeVisible();
    await joiner.getByRole("button", { name: /Join the circle|Open/ }).click();
    await joiner.waitForURL("**/home");
    await expect(joiner.getByText(`${PATIENT}’s circle`)).toBeVisible();
  });

  await test.step("owner adds a wish", async () => {
    await owner.goto("/wishes/new");
    await owner.getByLabel("What would you love to do?").fill("Feel the sea breeze at the beach with the grandkids");
    await owner.getByRole("button", { name: "Places" }).click();
    await owner.getByText("Everyone in the circle").click();
    await owner.getByRole("button", { name: "Save wish" }).click();
    await owner.waitForURL(/\/wishes\/[0-9a-f-]{36}$/);
    wishUrl = new URL(owner.url()).pathname;
  });

  await test.step("AI makes a plan with quests", async () => {
    await owner.getByTestId("make-plan").click();
    await expect(owner.getByTestId("planning")).toBeVisible();
    await expect(owner.getByTestId("plan")).toBeVisible({ timeout: 60_000 });
    await expect(owner.getByTestId("quest").first()).toBeVisible();
  });

  await test.step("claim on one phone shows on the other within 2 seconds, no reload", async () => {
    await joiner.goto(wishUrl);
    const firstQuestTitle = (await joiner.getByTestId("quest").first().locator("span").first().innerText()).trim();
    const ownerQuest = owner.getByTestId("quest").filter({ hasText: firstQuestTitle });
    await expect(ownerQuest).toHaveAttribute("data-status", "open");
    await owner.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

    const claimed = joiner.waitForResponse((r) => r.url().includes("/api/v1/quests/") && r.request().method() === "POST");
    await joiner.getByTestId("quest").first().getByRole("button", { name: "I’ll take this" }).click();
    expect((await claimed).ok()).toBe(true);
    const t0 = Date.now();
    await expect(ownerQuest).toHaveAttribute("data-status", "in_progress", { timeout: 5_000 });
    const ms = Date.now() - t0;
    console.log(`live update reached the other screen in ${ms} ms`);
    expect(ms).toBeLessThan(2_000);
    // Same page, not a navigation: the flag set before the claim is still there.
    expect(await owner.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    await expect(ownerQuest).toContainText(JOINER.name);
  });

  let cardTitle = "";
  await test.step("owner adds photos and a story; AI writes the card", async () => {
    await owner.getByRole("link", { name: "We did it, add moments" }).click();
    await owner.waitForURL("**/moments");
    await owner.getByTestId("photo-input").setInputFiles([fixture("beach-1.jpg"), fixture("beach-2.jpg")]);
    await expect(owner.getByTestId("photo-grid").locator("img")).toHaveCount(2);
    await owner.getByLabel("What happened?").fill("We went early on Saturday. The grandkids ran into the waves and she laughed the whole time.");
    await owner.getByTestId("make-card").click();
    await owner.waitForURL(/\/cards\/[0-9a-f-]{36}\/new$/, { timeout: 90_000 });
    await expect(owner.getByText("Made from 2 photos and your story")).toBeVisible();
    cardTitle = (await owner.getByTestId("reveal-card").getByRole("heading").innerText()).trim();
    expect(cardTitle.length).toBeGreaterThan(0);
  });

  await test.step("card reveal → added to the book, found under Places", async () => {
    await owner.getByTestId("add-to-book").click();
    await expect(owner.getByText("Saved in Places")).toBeVisible();
    await owner.goto("/book");
    await owner.getByRole("link", { name: "Places", exact: true }).click();
    const tile = owner.getByTestId("book-card").filter({ hasText: cardTitle });
    await expect(tile).toBeVisible();
    await tile.click();
    await expect(owner.getByRole("heading", { name: cardTitle })).toBeVisible();
    await expect(owner.getByTestId("card-photos").locator("img")).toHaveCount(2);
  });
});
