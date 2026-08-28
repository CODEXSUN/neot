import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { spawn } from "node:child_process";

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const serverEntry = resolve(root, "dist/platform/api/server.js");
const envPath = resolve(root, ".env");
assert.ok(existsSync(serverEntry), "Build the platform API before running the Agent team E2E test.");
assert.ok(existsSync(envPath), "The Agent team E2E test requires the repository .env file.");
process.loadEnvFile(envPath);
assert.ok(process.env.INITIAL_ADMIN_EMAIL, "INITIAL_ADMIN_EMAIL is required.");
assert.ok(process.env.INITIAL_ADMIN_PASSWORD, "INITIAL_ADMIN_PASSWORD is required.");

const temporaryRoot = await mkdtemp(join(tmpdir(), "neot-agent-team-"));
const repository = join(temporaryRoot, "source");
const worktrees = join(temporaryRoot, "worktrees");
const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const output = [];
let server = startServer();

try {
  await createFixture();
  await waitForHealth();
  const token = await login();
  const connections = await get("/api/neot/orchestration/codex/connections", token);
  const connectedConnectorIds = connections.data
    .filter((connection) => connection.connected)
    .map((connection) => connection.id);
  assert.ok(connectedConnectorIds.length, "No Codex connector is connected.");

  const team = await ensureTeam(token);
  const atlas = requirePersona(team, "atlas");
  const forge = requirePersona(team, "forge");
  const canvas = requirePersona(team, "canvas");
  const originalForgeName = forge.name;
  await request(`/api/neot/orchestration/agent-ide/personas/${forge.uuid}`, token, "PUT", {
    ...personaInput(forge),
    name: "Forge E2E"
  });
  const renamed = await get("/api/neot/orchestration/agent-ide/personas", token);
  assert.equal(requirePersona(renamed.data, "forge").name, "Forge E2E");
  await request(`/api/neot/orchestration/agent-ide/personas/${forge.uuid}`, token, "PUT", {
    ...personaInput(forge),
    name: originalForgeName
  });

  const parentRunUuid = await createParentRun(token);
  const graph = await request(
    `/api/neot/orchestration/agent-ide/runs/${parentRunUuid}/tasks`,
    token,
    "PUT",
    {
      supervisorPersonaUuid: atlas.uuid,
      tasks: [
        task("backend", "Write backend marker", forge.uuid, "src/backend.txt", []),
        task("frontend", "Write frontend marker", canvas.uuid, "src/frontend.txt", []),
        {
          ...task("review", "Review delegate markers", atlas.uuid, "src/", ["backend", "frontend"]),
          agentProfile: "review",
          objective: "Inspect both dependency workspaces. Confirm that backend-complete and frontend-complete are present. Do not change files."
        }
      ]
    }
  );
  assert.equal(graph.data?.supervisor?.name, atlas.name);
  assert.deepEqual(graph.data?.tasks.map((entry) => entry.status), ["ready", "ready", "blocked"]);

  const mismatch = await rawRequest(
    `/api/neot/orchestration/agent-ide/tasks/${graph.data.tasks[0].uuid}/delegate`,
    token,
    "PUT",
    { personaUuid: atlas.uuid }
  );
  assert.equal(mismatch.response.status, 409, JSON.stringify(mismatch.body));
  assert.equal(
    mismatch.body?.error?.code,
    "AGENT_DELEGATE_REQUIRED",
    "A supervisor must not be assigned directly to a coding task."
  );

  await Promise.all([
    request(`/api/neot/orchestration/agent-ide/tasks/${graph.data.tasks[0].uuid}/start`, token, "POST"),
    request(`/api/neot/orchestration/agent-ide/tasks/${graph.data.tasks[1].uuid}/start`, token, "POST")
  ]);
  await restartServer();
  const codingComplete = await waitForGraph(parentRunUuid, token, (current) =>
    current.tasks[0]?.status === "completed" && current.tasks[1]?.status === "completed"
  );
  assert.equal(codingComplete.tasks[2]?.status, "ready");
  const backendRun = await verifyDelegateFile(codingComplete.tasks[0], "backend-complete\n", token, true);
  const frontendRun = await verifyDelegateFile(codingComplete.tasks[1], "frontend-complete\n", token, true);
  assert.ok(connectedConnectorIds.includes(backendRun.connectionId));
  assert.ok(connectedConnectorIds.includes(frontendRun.connectionId));
  if (connectedConnectorIds.length > 1) {
    assert.notEqual(
      backendRun.connectionId,
      frontendRun.connectionId,
      "Parallel delegates did not rotate across the connected Codex slots."
    );
  }

  await request(
    `/api/neot/orchestration/agent-ide/tasks/${codingComplete.tasks[2].uuid}/start`,
    token,
    "POST"
  );
  const reviewedGraph = await waitForGraph(parentRunUuid, token, (current) =>
    current.tasks.every((entry) => entry.status === "completed")
  );
  assert.equal(reviewedGraph.tasks[2]?.delegate?.name, atlas.name);
  assert.ok(reviewedGraph.tasks[2]?.resultSummary, "The supervisor returned no review summary.");

  const approved = await request(
    `/api/neot/orchestration/agent-ide/runs/${parentRunUuid}/parent-review`,
    token,
    "POST",
    { decision: "approved", note: "E2E human review approved all completed Agent tasks." }
  );
  assert.equal(approved.data?.reviews?.[0]?.decision, "approved");
  const parent = await get(`/api/neot/orchestration/agent-ide/runs/${parentRunUuid}`, token);
  assert.equal(parent.data?.reviewStatus, "parent_approved");
  assert.equal(parent.data?.supervisorPersonaUuid, atlas.uuid);
  assert.equal(
    parent.data?.events?.filter((event) => event.type === "run.task.recovered").length,
    2,
    "The parent run did not record both recovered delegates."
  );

  console.info("Named Agent team E2E passed: API restart recovery, parallel delegates, isolated files, supervisor review, and human approval verified.");
} catch (error) {
  console.error(output.join(""));
  throw error;
} finally {
  await stopServer();
  try {
    await rm(temporaryRoot, { force: true, maxRetries: 5, recursive: true, retryDelay: 500 });
  } catch (error) {
    console.warn(`Could not remove the temporary Agent team fixture: ${error.message}`);
  }
}

async function createFixture() {
  await mkdir(join(repository, "src"), { recursive: true });
  await git(temporaryRoot, ["init", repository]);
  await git(repository, ["config", "user.email", "agent-team@example.test"]);
  await git(repository, ["config", "user.name", "Agent Team Test"]);
  await writeFile(join(repository, "AGENTS.md"), "# Test rules\nEdit only the assigned file. Do not commit or push.\n", "utf8");
  await writeFile(join(repository, "src", "backend.txt"), "pending\n", "utf8");
  await writeFile(join(repository, "src", "frontend.txt"), "pending\n", "utf8");
  await git(repository, ["add", "."]);
  await git(repository, ["commit", "-m", "Initial Agent team fixture"]);
}

async function createParentRun(token) {
  const response = await fetch(`${baseUrl}/api/neot/orchestration/agent-ide/codex/chat/stream`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      access: "auto-approve",
      attachments: [],
      connectionId: "primary",
      conversationId: null,
      message: "Coordinate a supervised team that updates the backend and frontend marker files. For this parent turn only, reply with exactly READY without inspecting, running commands, or changing files.",
      model: "gpt-5.6-terra",
      threadId: null,
      workItem: null,
      project: {
        description: "Isolated named Agent E2E fixture.",
        id: `agent-team-e2e-${Date.now()}`,
        key: "AGENT-TEAM-E2E",
        moduleKey: "orchestration",
        referenceId: repository,
        referenceType: "workspace",
        title: "Named Agent E2E"
      }
    }),
    signal: AbortSignal.timeout(180_000)
  });
  if (response.status !== 200) {
    assert.fail(`Parent run creation failed (${response.status}): ${await response.text()}`);
  }
  let runUuid = "";
  for await (const line of ndjson(response.body)) {
    if (line.type === "chat.started") runUuid = line.runId;
    if (line.type === "chat.failed") assert.fail(line.message);
  }
  assert.match(runUuid, /^[a-f0-9]{16}$/u);
  return runUuid;
}

function task(key, title, delegatePersonaUuid, scopePath, dependsOn) {
  const marker = key === "backend" ? "backend-complete" : "frontend-complete";
  return {
    agentProfile: "coding",
    delegatePersonaUuid,
    dependsOn,
    key,
    objective: `Replace ${scopePath} with exactly ${marker} followed by one newline. Do not change other files.`,
    scopePaths: [scopePath],
    title
  };
}

async function ensureTeam(token) {
  const current = await get("/api/neot/orchestration/agent-ide/personas", token);
  if (current.data?.length) return current.data;
  return (await request("/api/neot/orchestration/agent-ide/personas/starter-team", token, "POST")).data;
}

async function waitForGraph(runUuid, token, predicate) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 240_000) {
    const graph = await get(`/api/neot/orchestration/agent-ide/runs/${runUuid}/tasks`, token);
    if (predicate(graph.data)) return graph.data;
    const failed = graph.data?.tasks?.find((entry) => entry.status === "failed");
    if (failed) assert.fail(`${failed.title}: ${failed.resultSummary}`);
    await delay(1_000);
  }
  assert.fail("The named Agent graph did not complete before its E2E timeout.");
}

async function verifyDelegateFile(taskResult, expected, token, recovered = false) {
  assert.ok(taskResult.childRunUuid);
  const run = await get(`/api/neot/orchestration/agent-ide/runs/${taskResult.childRunUuid}`, token);
  assert.equal(run.data?.workspaceMode, "worktree");
  assert.equal(run.data?.workspaceStatus, "changed");
  assert.equal(await readFile(join(run.data.workspacePath, taskResult.scopePaths[0]), "utf8"), expected);
  assert.deepEqual(run.data?.artifacts?.map((entry) => entry.path), taskResult.scopePaths);
  if (recovered) {
    assert.ok(
      run.data?.events?.some((event) => event.type === "run.recovered"),
      `${taskResult.title} has no child recovery event.`
    );
  }
  return run.data;
}

function requirePersona(team, key) {
  const persona = team.find((entry) => entry.key === key);
  assert.ok(persona, `Missing ${key} persona.`);
  return persona;
}

function personaInput(persona) {
  return {
    agentProfile: persona.agentProfile,
    description: persona.description,
    instructions: persona.instructions,
    key: persona.key,
    role: persona.role
  };
}

async function login() {
  const result = await rawRequest("/auth/login", "", "POST", {
    email: process.env.INITIAL_ADMIN_EMAIL,
    password: process.env.INITIAL_ADMIN_PASSWORD
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return result.body.data.accessToken;
}

async function get(path, token) {
  return request(path, token, "GET");
}

async function request(path, token, method, body) {
  const result = await rawRequest(path, token, method, body);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return result.body;
}

async function rawRequest(path, token, method, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { body: await response.json(), response };
}

async function* ndjson(body) {
  assert.ok(body);
  let buffer = "";
  for await (const chunk of body) {
    buffer += Buffer.from(chunk).toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line);
  }
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(output.join(""));
    try {
      if ((await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1_000) })).ok) return;
    } catch { /* The API can refuse connections while it starts. */ }
    await delay(250);
  }
  throw new Error(`API did not become ready.\n${output.join("")}`);
}

function startServer() {
  const child = spawn(process.execPath, [serverEntry], {
    cwd: root,
    env: {
      ...process.env,
      NEOT_AGENT_ALLOWED_ROOTS: temporaryRoot,
      NEOT_AGENT_WORKTREE_ROOT: worktrees,
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
  return child;
}

async function restartServer() {
  await stopServer();
  await delay(500);
  output.push("\n--- API restart recovery ---\n");
  server = startServer();
  await waitForHealth();
}

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolveExit) => server.once("exit", resolveExit)), delay(5_000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      assert.ok(address && typeof address !== "string");
      socket.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

function git(cwd, args) { return execute("git", ["-C", cwd, ...args], { windowsHide: true }); }
function delay(milliseconds) { return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)); }
