import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const serverEntry = resolve(root, "dist/platform/api/server.js");
const envPath = resolve(root, ".env");

assert.ok(existsSync(serverEntry), "Build the application before running the runtime smoke test.");
assert.ok(existsSync(envPath), "A configured root .env is required for the runtime smoke test.");
process.loadEnvFile(envPath);

const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
const password = process.env.INITIAL_ADMIN_PASSWORD?.trim();
assert.ok(email, "INITIAL_ADMIN_EMAIL is required for the runtime smoke test.");
assert.ok(password, "INITIAL_ADMIN_PASSWORD is required for the runtime smoke test.");

for (let cycle = 1; cycle <= 2; cycle += 1) {
  await smokeCycle(cycle);
}

console.info(
  "Runtime smoke passed: two API boots, single-client identity, NEOT orchestration/project/task routes, and logout."
);

async function smokeCycle(cycle) {
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  const child = spawn(process.execPath, [serverEntry], {
    cwd: root,
    env: {
      ...process.env,
      DEV_AUTO_LOGIN: "0",
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
    await waitForHealth(baseUrl, child, output);

    const health = await request(baseUrl, "/health", {
      headers: { "x-tenant-id": "caller-controlled-tenant" }
    });
    assert.equal(health.response.status, 200);
    assert.equal(health.body.success, true);
    assert.equal(health.response.headers.get("x-tenant-id"), null);
    assert.equal(health.body.meta?.tenantId, undefined);

    const anonymousSession = await request(baseUrl, "/auth/session");
    assert.equal(anonymousSession.response.status, 401);
    assert.equal(anonymousSession.body.error?.code, "AUTH_SESSION_EXPIRED");

    const login = await request(baseUrl, "/auth/login", {
      body: JSON.stringify({ email, password }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.body.success, true);
    assert.equal(login.body.data?.email, email.toLowerCase());
    assert.ok(login.body.data?.accessToken);
    assert.equal(login.body.data?.role, "admin");
    assert.ok(login.body.data?.permissions?.includes("identity.user.view"));
    assert.ok(login.body.data?.permissions?.includes("neot.project-manager.view"));
    assert.ok(login.body.data?.permissions?.includes("neot.orchestration.view"));

    const session = await request(baseUrl, "/auth/session", {
      headers: { authorization: `Bearer ${login.body.data.accessToken}` }
    });
    assert.equal(session.response.status, 200);
    assert.equal(session.body.data?.authenticated, true);
    assert.equal(session.body.data?.email, email.toLowerCase());
    assert.equal(session.body.data?.role, "admin");
    assert.ok(session.body.data?.permissions?.includes("identity.user.view"));
    assert.ok(session.body.data?.permissions?.includes("neot.project-manager.view"));
    assert.ok(session.body.data?.permissions?.includes("neot.orchestration.view"));

    const orchestration = await request(baseUrl, "/api/neot/orchestration/catalog", {
      headers: { authorization: `Bearer ${login.body.data.accessToken}` }
    });
    assert.equal(orchestration.response.status, 200);
    assert.equal(orchestration.body.success, true);
    assert.equal(orchestration.body.data?.externalLabel, "NEOT");
    assert.equal(orchestration.body.data?.technicalName, "neot");
    assert.equal(orchestration.body.data?.agentProfiles?.length, 6);
    assert.equal(orchestration.body.data?.assistModes?.length, 9);

    const tools = await request(baseUrl, "/api/neot/orchestration/agent-ide/tools", {
      headers: { authorization: `Bearer ${login.body.data.accessToken}` }
    });
    assert.equal(tools.response.status, 200);
    assert.ok(tools.body.data?.some((tool) => tool.id === "repository.read"));
    assert.ok(tools.body.data?.some((tool) => tool.id === "deployment.execute" && tool.risk === "critical"));

    const verificationCommands = await request(baseUrl, "/api/neot/orchestration/agent-ide/verification/commands", {
      headers: { authorization: `Bearer ${login.body.data.accessToken}` }
    });
    assert.equal(verificationCommands.response.status, 200);
    assert.ok(verificationCommands.body.data?.some((command) => command.id === "git.diff-check" && command.required));

    const projects = await request(baseUrl, "/api/neot/admin/project-manager/result", {
      headers: { authorization: `Bearer ${login.body.data.accessToken}` }
    });
    assert.equal(projects.response.status, 200);
    assert.equal(projects.body.success, true);
    assert.ok(projects.body.data?.summary);

    const todos = await request(baseUrl, "/api/neot/task-manager/todos", {
      headers: { authorization: `Bearer ${login.body.data.accessToken}` }
    });
    assert.equal(todos.response.status, 200);
    assert.equal(todos.body.success, true);
    assert.ok(Array.isArray(todos.body.data));

    const logout = await request(baseUrl, "/auth/logout", { method: "POST" });
    assert.equal(logout.response.status, 200);
    assert.equal(logout.body.data?.loggedOut, true);
    console.info(`Runtime smoke cycle ${cycle} passed on ${baseUrl}.`);
  } finally {
    await stop(child);
  }
}

async function request(baseUrl, path, init) {
  const { timeoutMs = 5_000, ...requestInit } = init ?? {};
  const response = await fetch(`${baseUrl}${path}`, {
    ...requestInit,
    signal: AbortSignal.timeout(timeoutMs)
  });
  return { body: await response.json(), response };
}

async function waitForHealth(baseUrl, child, output) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    if (child.exitCode !== null) {
      throw new Error(`API exited before becoming healthy.\n${output.join("")}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(1_000)
      });
      if (response.ok) return;
    } catch {
      // The API can refuse connections while the process is still booting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`API did not become healthy.\n${output.join("")}`);
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

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveWait) => setTimeout(resolveWait, 5_000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
