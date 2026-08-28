import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const serverEntry = resolve(root, "dist/platform/api/server.js");
const envPath = resolve(root, ".env");

assert.ok(existsSync(serverEntry), "Build the platform API before this test.");
assert.ok(existsSync(envPath), "Create the root .env file before this test.");
process.loadEnvFile(envPath);
assert.ok(
  process.env.OPENAI_API_KEY?.trim(),
  "OPENAI_API_KEY is required for the live stream test."
);
assert.ok(process.env.INITIAL_ADMIN_EMAIL?.trim(), "INITIAL_ADMIN_EMAIL is required.");
assert.ok(process.env.INITIAL_ADMIN_PASSWORD?.trim(), "INITIAL_ADMIN_PASSWORD is required.");

const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const output = [];
const child = spawn(process.execPath, [serverEntry], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "test",
    PLATFORM_API_PORT: String(port),
    PLATFORM_API_URL: baseUrl,
    PLATFORM_WEB_ORIGIN: "http://127.0.0.1:9260"
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});
child.stdout.on("data", (chunk) => output.push(String(chunk)));
child.stderr.on("data", (chunk) => output.push(String(chunk)));

try {
  await waitForHealth();
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.INITIAL_ADMIN_EMAIL,
      password: process.env.INITIAL_ADMIN_PASSWORD
    })
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200, JSON.stringify(login));
  const token = login.data?.accessToken;
  assert.ok(token, "Login did not return an access token.");

  const response = await fetch(`${baseUrl}/api/neot/orchestration/launch-desk/stream`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      productBrief:
        "Launch a project-aware release planner that turns engineering briefs into approved release tasks and measurable launch evidence.",
      audience: "Engineering managers and product leads who coordinate software releases.",
      launchDate: "2026-09-15",
      constraints: "Require a rollback plan and human approval before production changes.",
      availableAssets: ["Beta feedback", "Release notes draft", "Product walkthrough"]
    }),
    signal: AbortSignal.timeout(180_000)
  });
  assert.equal(response.status, 200, await response.text());
  assert.ok(response.body, "The stream response has no body.");

  let buffer = "";
  let toolProgress = false;
  let textDelta = false;
  for await (const chunk of response.body) {
    buffer += Buffer.from(chunk).toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "tool.progress") toolProgress = true;
      if (event.type === "text.delta" && event.delta) textDelta = true;
    }
  }
  assert.ok(toolProgress, "The stream did not emit a tool progress event.");
  assert.ok(textDelta, "The stream did not emit a model text delta.");
  console.info("Launch Desk live stream passed: tool progress and model text delta received.");
} finally {
  child.kill("SIGTERM");
}

async function waitForHealth() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    if (child.exitCode !== null) throw new Error(output.join(""));
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // The server can refuse requests while it starts.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`The API did not start.\n${output.join("")}`);
}

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      server.close((error) => (error ? reject(error) : resolvePort(address.port)));
    });
  });
}
