import { defineConfig, devices } from "@playwright/test";

// Smoke test of the demo loop against a deployed URL (default: production).
// SMOKE_BASE_URL=http://localhost:3000 pnpm smoke  — to run against a local dev server.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // the tests share demo accounts
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "https://1stquest.vercel.app",
    ...devices["iPhone 13"],
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
