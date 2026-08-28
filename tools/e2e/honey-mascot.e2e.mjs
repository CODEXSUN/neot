import { expect, test } from "@playwright/test";

process.loadEnvFile(".env");

test("Honey remains visible through idle, moves naturally, and supports placement", async ({
  page
}) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onend = null;
      onerror = null;
      onresult = null;

      start() {
        window.setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ 0: { transcript: "Open my tasks" }, isFinal: true }]
          });
          this.onend?.();
        }, 50);
      }

      stop() {
        this.onend?.();
      }
    }
    window.SpeechRecognition = MockSpeechRecognition;
    window.localStorage.setItem("neot.screen-companion.visible", "true");
    window.sessionStorage.setItem("neot.screen-companion.honey-introduced", "true");
    if (!window.localStorage.getItem("neot.screen-companion.position")) {
      window.localStorage.setItem(
        "neot.screen-companion.position",
        JSON.stringify({ x: 64, y: 420 })
      );
    }
    window.localStorage.setItem("neot.screen-companion.behavior", "stay");
  });
  await page.route("**/api/neot/honey/**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const now = new Date().toISOString();
    await new Promise((resolve) => setTimeout(resolve, 300));
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: {
          id: "mascot-voice-thread",
          messages: [
            { body: "Open my tasks", createdAt: now, id: "voice-user", role: "user" },
            {
              body: "Here are your current tasks.",
              createdAt: now,
              id: "voice-honey",
              role: "assistant"
            }
          ],
          title: "Open my tasks"
        },
        success: true
      }
    });
  });

  await page.goto("/login");
  await signInWhenRequired(page);
  await page.goto("/app/neot/overview");

  const mascot = page.getByTestId("screen-mascot");
  const sprite = mascot.locator("[data-mascot-frame]");
  await expect(mascot).toBeVisible();
  await expect(mascot).toHaveAttribute("data-mascot-mode", "idle");
  await expect(mascot).toHaveAttribute("data-mascot-behavior", "stay");
  await expect(sprite).toHaveAttribute("data-mascot-frame-count", "7");

  for (let sample = 0; sample < 12; sample += 1) {
    await expect(sprite).toBeVisible();
    const frame = Number(await sprite.getAttribute("data-mascot-frame"));
    expect(frame).toBeGreaterThanOrEqual(0);
    expect(frame).toBeLessThan(7);
    expect(await sprite.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe(
      "none"
    );
    await page.waitForTimeout(450);
  }

  const initialBox = await mascot.boundingBox();
  expect(initialBox).not.toBeNull();
  const grabPoint = {
    x: initialBox.x + initialBox.width / 2,
    y: initialBox.y + initialBox.height / 2
  };
  const releasePoint = { x: grabPoint.x + 260, y: grabPoint.y - 140 };
  await page.mouse.move(grabPoint.x, grabPoint.y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(
      grabPoint.x + ((releasePoint.x - grabPoint.x) * step) / 6,
      grabPoint.y + ((releasePoint.y - grabPoint.y) * step) / 6
    );
    const movingBox = await mascot.boundingBox();
    expect(movingBox.y).toBeGreaterThan(20);
  }
  await page.mouse.up();
  const placedBox = await mascot.boundingBox();
  expect(placedBox).not.toBeNull();
  expect(placedBox.x).toBeCloseTo(initialBox.x + 260, -1);
  expect(placedBox.y).toBeCloseTo(initialBox.y - 140, -1);

  await mascot.hover();
  await page.getByRole("button", { name: "Honey movement options" }).click();
  await page.getByRole("menuitem", { name: "Use current at startup" }).click();
  await expect(mascot).toHaveAttribute("data-mascot-behavior", "stay");
  await page.reload();
  await expect(mascot).toBeVisible();
  const restoredBox = await mascot.boundingBox();
  expect(restoredBox.x).toBeCloseTo(placedBox.x, 0);
  expect(restoredBox.y).toBeCloseTo(placedBox.y, 0);

  await expect(page.getByText("Hi, I'm Honey")).toBeAttached();
  await expect(page.getByText("Waiting to help you")).toBeAttached();

  const voiceButton = page.getByRole("button", { name: "Start Honey voice input" });
  await page.mouse.move(10, 10);
  await expect(voiceButton).toHaveCSS("opacity", "0");
  await mascot.hover();
  await expect(voiceButton).toHaveCSS("opacity", "1");
  await voiceButton.click();
  await expect(page.getByText("Let me think about that.")).toBeVisible();
  await expect(page.getByText("Latest three messages")).toBeVisible();
  await expect(page.getByText("Open my tasks", { exact: true })).toBeVisible();
  await mascot.hover();
  await expect(page.getByRole("button", { name: "Close Honey message" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start Honey voice input" })).toBeAttached();

  await mascot.hover();
  await page.getByRole("button", { name: "Honey movement options" }).click();
  await page.getByRole("menuitem", { name: "Roam left and right" }).click();
  await expect(mascot).toHaveAttribute("data-mascot-behavior", "roam");
});

test("Honey submits a completed voice turn and reacts without roaming", async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onend = null;
      onerror = null;
      onresult = null;

      start() {
        window.setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ 0: { transcript: "Show my next task" }, isFinal: true }]
          });
          this.onend?.();
        }, 100);
      }

      stop() {
        this.onend?.();
      }
    }
    window.SpeechRecognition = MockSpeechRecognition;
    window.localStorage.setItem("neot.screen-companion.visible", "true");
    window.sessionStorage.setItem("neot.screen-companion.honey-introduced", "true");
    window.localStorage.setItem(
      "neot.screen-companion.position",
      JSON.stringify({ x: 900, y: 500 })
    );
    window.localStorage.setItem("neot.screen-companion.behavior", "roam");
  });
  const now = new Date().toISOString();
  const voiceConversation = {
    id: "voice-thread",
    messages: [
      { body: "Show my next task", createdAt: now, id: "user-voice", role: "user" },
      {
        actions: [
          {
            id: "explain-error",
            label: "Explain an error",
            prompt: "Help me understand this error and suggest the safest next step: "
          },
          { href: "/app/neot/agent-ide", id: "start-agent", label: "Start Project Agent" },
          { href: "/app/neot/tasks", id: "open-project", label: "Open related work" }
        ],
        body: "Your next task is ready.",
        createdAt: now,
        id: "assistant-voice",
        role: "assistant"
      }
    ],
    title: "Show my next task"
  };
  await page.route("**/api/neot/honey/**", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return route.fulfill({
        contentType: "application/json",
        json: { data: voiceConversation, success: true }
      });
    }
    const data = route.request().url().endsWith("/conversations") ? [] : voiceConversation;
    return route.fulfill({ contentType: "application/json", json: { data, success: true } });
  });

  await page.goto("/login");
  await signInWhenRequired(page);
  await page.waitForLoadState("networkidle");
  await page.goto("/app/neot/honey");
  await expect(page.getByRole("heading", { exact: true, name: "Honey" })).toBeVisible();

  const mascot = page.getByTestId("screen-mascot");
  await expect(mascot).toHaveAttribute("data-mascot-behavior", "stay");
  const stablePosition = await mascot.boundingBox();
  await page.getByRole("button", { name: "Start voice typing" }).click();
  await expect(mascot).toHaveAttribute("data-mascot-conversation-state", "listening");
  await expect(mascot).toHaveAttribute("data-mascot-conversation-state", "thinking");
  await expect(page.getByText("Show my next task", { exact: true })).toBeVisible();
  await expect(page.getByText("Your next task is ready.")).toBeVisible();
  await expect(mascot).toHaveAttribute("data-mascot-conversation-state", "answered");
  await expect(page.getByRole("link", { name: /Start Project Agent/u })).toHaveAttribute(
    "href",
    "/app/neot/agent-ide"
  );
  await expect(page.getByRole("link", { name: /Open related work/u })).toHaveAttribute(
    "href",
    "/app/neot/tasks"
  );
  await page.getByRole("button", { name: /Explain an error/u }).click();
  await expect(page.getByLabel("Message Honey")).toHaveValue(
    "Help me understand this error and suggest the safest next step: "
  );
  const answeredPosition = await mascot.boundingBox();
  expect(answeredPosition.x).toBeCloseTo(stablePosition.x, 0);
  expect(answeredPosition.y).toBeCloseTo(stablePosition.y, 0);
});

async function signInWhenRequired(page) {
  const email = page.getByLabel("Email");
  if (!(await email.isVisible())) return;
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  expect(adminEmail, "INITIAL_ADMIN_EMAIL must be configured for Honey E2E").toBeTruthy();
  expect(adminPassword, "INITIAL_ADMIN_PASSWORD must be configured for Honey E2E").toBeTruthy();
  await email.fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app\//u);
}
