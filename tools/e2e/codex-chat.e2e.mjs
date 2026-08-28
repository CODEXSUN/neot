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
  const token = await login();
  await cleanupTestUsers(token);
  const status = await get("/api/neot/orchestration/codex/status", token);
  assert.equal(status.data?.connected, true, "Independent Codex account is not connected.");

  const response = await fetch(
    `${baseUrl}/api/neot/orchestration/agent-ide/codex/chat/stream`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        access: "read-only",
        attachments: [
          {
            content: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            kind: "image",
            mimeType: "image/png",
            name: "context.png",
            size: 68
          }
        ],
        connectionId: "primary",
        conversationId: null,
        message: "Reply with one short sentence confirming the project key and read-only mode.",
        model: "gpt-5.6-terra",
        threadId: null,
        workItem: null,
        project: {
          id: "e2e-project",
          key: "NEOT-E2E",
          title: "NEOT Codex Chat",
          description: "Validate project-aware Codex chat streaming.",
          moduleKey: "agent-ide",
          referenceId: "E:/Workspace/codexsun/neot",
          referenceType: "workspace"
        }
      }),
      signal: AbortSignal.timeout(180_000)
    }
  );
  if (response.status !== 200) {
    assert.fail(`Codex chat returned ${response.status}: ${await response.text()}`);
  }
  assert.ok(response.body, "The Codex chat response has no stream body.");

  let buffer = "";
  let started = false;
  let conversationId = null;
  let runId = null;
  let assistantMessageId = null;
  let textDelta = false;
  let completed = false;
  for await (const chunk of response.body) {
    buffer += Buffer.from(chunk).toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "chat.started" && event.threadId) {
        started = true;
        conversationId = event.conversationId;
        runId = event.runId;
      }
      if (event.type === "chat.delta" && event.delta) textDelta = true;
      if (event.type === "chat.completed") {
        completed = true;
        assistantMessageId = event.messageId;
      }
      if (event.type === "chat.failed") throw new Error(event.message);
    }
  }
  assert.ok(started, "Codex chat did not start a thread and turn.");
  assert.ok(textDelta, "Codex chat did not emit an agent text delta.");
  assert.ok(completed, "Codex chat did not complete its turn.");
  assert.ok(conversationId, "Codex chat did not return a persisted conversation ID.");
  assert.ok(runId, "Codex chat did not return a durable Agent run ID.");
  assert.ok(assistantMessageId, "Codex chat did not return a persisted assistant message ID.");
  const history = await get(`/api/neot/orchestration/agent-ide/chats/${conversationId}`, token);
  assert.equal(history.data?.messages?.length, 2, "Persisted chat should contain user and assistant messages.");
  assert.equal(history.data?.connectionId, "primary", "The chat lost its selected Codex connector.");
  await jsonRequest(
    `/api/neot/orchestration/agent-ide/chat-messages/${assistantMessageId}/feedback`,
    token,
    "PUT",
    { feedback: "up" }
  );
  const reviewed = await get(`/api/neot/orchestration/agent-ide/chats/${conversationId}`, token);
  assert.equal(reviewed.data?.messages?.[1]?.feedback, "up", "Assistant feedback was not persisted.");
  const run = await get(`/api/neot/orchestration/agent-ide/runs/${runId}`, token);
  assert.equal(run.data?.status, "completed", "The Agent run did not complete.");
  assert.equal(run.data?.connectionId, "primary", "The Agent run lost its selected Codex connector.");
  assert.equal(run.data?.projectUuid, "e2e-project", "The Agent run lost its project context.");
  assert.equal(run.data?.workspaceMode, "source", "Read-only Agent runs must stay on the source checkout.");
  assert.equal(run.data?.workspaceStatus, "source", "Read-only workspace evidence was not persisted.");
  assert.equal(run.data?.verificationStatus, "not_run", "A new Agent run has an invalid verification state.");
  const blockedVerification = await fetch(
    `${baseUrl}/api/neot/orchestration/agent-ide/runs/${runId}/verification`,
    { method: "POST", headers: { authorization: `Bearer ${token}` } }
  );
  const blockedVerificationBody = await blockedVerification.json();
  assert.equal(blockedVerification.status, 409, JSON.stringify(blockedVerificationBody));
  assert.equal(blockedVerificationBody.error?.code, "AGENT_WORKTREE_REQUIRED");
  assert.ok(Array.isArray(run.data?.events) && run.data.events.length >= 3, "The Agent run did not persist lifecycle events.");
  const runs = await get("/api/neot/orchestration/agent-ide/runs?projectUuid=e2e-project", token);
  assert.equal(runs.data?.[0]?.uuid, runId, "The project run history did not return the latest run.");

  const isolatedEmail = `codex-history-${Date.now()}@example.test`;
  const isolatedPassword = "NEOT-Test-9081";
  const createdUser = await jsonRequest("/identity/users", token, "POST", {
    email: isolatedEmail,
    name: "Codex History Isolation",
    password: isolatedPassword,
    status: "active"
  });
  const isolatedToken = await login(isolatedEmail, isolatedPassword);
  const isolatedHistory = await get("/api/neot/orchestration/agent-ide/chats", isolatedToken);
  assert.equal(isolatedHistory.data?.length, 0, "A different user could see another user's chat history.");
  const isolatedRuns = await get("/api/neot/orchestration/agent-ide/runs?projectUuid=e2e-project", isolatedToken);
  assert.equal(isolatedRuns.data?.length, 0, "A different user could see another user's Agent runs.");
  await deleteTestUser(createdUser.data, token);
  await jsonRequest(`/api/neot/orchestration/agent-ide/chats/${conversationId}`, token, "DELETE");
  console.info("Codex chat live stream passed: durable runs, database history, feedback, and user isolation verified.");
} catch (error) {
  console.error(output.join(""));
  throw error;
} finally {
  child.kill("SIGTERM");
}

async function login(email = process.env.INITIAL_ADMIN_EMAIL, password = process.env.INITIAL_ADMIN_PASSWORD) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.ok(body.data?.accessToken, "Login did not return an access token.");
  return body.data.accessToken;
}

async function jsonRequest(path, token, method, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
}

async function cleanupTestUsers(token) {
  const users = await get("/identity/users?search=codex-history-", token);
  for (const user of users.data ?? []) {
    if (!user.isProtected) await deleteTestUser(user, token);
  }
}

async function deleteTestUser(user, token) {
  const assignments = await get(`/identity/user-roles?search=${encodeURIComponent(user.email)}`, token);
  for (const assignment of assignments.data ?? []) {
    if (!assignment.isProtected) {
      await jsonRequest(`/identity/user-roles/${assignment.id}/force`, token, "DELETE");
    }
  }
  await jsonRequest(`/identity/users/${user.id}/force`, token, "DELETE");
}

async function get(path, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
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
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`API did not become ready.\n${output.join("")}`);
}

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const selectedPort = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolvePort(selectedPort)));
    });
  });
}
