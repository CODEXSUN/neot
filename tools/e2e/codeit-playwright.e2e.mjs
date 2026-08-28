import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const desktopRoot = resolve(root, "apps/codeit/desktop");

console.log("[Playwright E2E]: Starting CodeIt Desktop Vite dev server...");

const server = await createServer({
  root: desktopRoot,
  server: { port: 5199, strictPort: true },
});
await server.listen();

console.log("[Playwright E2E]: Launching Chromium browser on http://localhost:5199...");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("http://localhost:5199");
await page.waitForLoadState("networkidle");

console.log("[Playwright E2E]: Verifying page title & initial UI components...");
const title = await page.title();
console.log(`Page title: ${title}`);
assert.ok(title.toLowerCase().includes("codeit"), `Unexpected page title: ${title}`);

// 1. Test Chat Input with Prompt "plan for messaging system in this"
console.log("[Playwright E2E]: Sending prompt: 'plan for messaging system in this'...");
const textarea = page.locator("textarea");
await textarea.fill("plan for messaging system in this");
await page.click("button[title='Send Prompt']");

// Wait for assistant response
console.log("[Playwright E2E]: Waiting for AI assistant response...");
await page.waitForTimeout(1000);

const pageContent = await page.content();
assert.ok(
  pageContent.includes("Architectural Implementation"),
  "Playwright E2E failed: Response did not include Architectural Implementation"
);
assert.ok(
  pageContent.includes("Messaging System"),
  "Playwright E2E failed: Response did not contain Messaging System topic"
);

console.log("[Playwright E2E]: Plan response verified successfully!");

// 2. Test Direct Instruction "say yes"
console.log("[Playwright E2E]: Sending prompt: 'say yes'...");
await textarea.fill("say yes");
await page.click("button[title='Send Prompt']");
await page.waitForTimeout(1000);

const updatedContent = await page.content();
assert.ok(
  updatedContent.includes("Yes."),
  "Playwright E2E failed: Response to 'say yes' was not 'Yes.'"
);

console.log("[Playwright E2E]: Direct instruction 'say yes' verified successfully!");

await browser.close();
await server.close();

console.log("=== Playwright E2E Live Test PASSED ===");
