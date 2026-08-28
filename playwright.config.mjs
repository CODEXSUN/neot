import { defineConfig } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: "line",
  testDir: "./tools/e2e",
  testMatch: "**/*.e2e.mjs",
  timeout: 45_000,
  use: {
    baseURL: process.env.PLATFORM_WEB_ORIGIN ?? "http://127.0.0.1:9260",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  }
});
