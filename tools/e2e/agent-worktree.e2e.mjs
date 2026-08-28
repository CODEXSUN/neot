import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const modulePath = resolve(
  root,
  "dist/neot/api/modules/orchestration/agent-worktree.service.js"
);
const budgetModulePath = resolve(
  root,
  "dist/neot/api/modules/orchestration/agent-run.budget.js"
);
const verificationModulePath = resolve(
  root,
  "dist/neot/api/modules/orchestration/agent-verification.service.js"
);
const integrationModulePath = resolve(
  root,
  "dist/neot/api/modules/orchestration/agent-integration.service.js"
);
const fingerprintModulePath = resolve(
  root,
  "dist/neot/api/modules/orchestration/agent-workspace-fingerprint.js"
);
const temporaryRoot = await mkdtemp(join(tmpdir(), "neot-agent-worktree-"));
const repository = join(temporaryRoot, "source");
const worktrees = join(temporaryRoot, "worktrees");

try {
  await git(temporaryRoot, ["init", repository]);
  await git(repository, ["config", "user.email", "agent-worktree@example.test"]);
  await git(repository, ["config", "user.name", "Agent Worktree Test"]);
  await writeFile(join(repository, "README.md"), "# Source\n", "utf8");
  await git(repository, ["add", "README.md"]);
  await git(repository, ["commit", "-m", "Initial test state"]);

  process.env.NEOT_AGENT_ALLOWED_ROOTS = temporaryRoot;
  process.env.NEOT_AGENT_WORKTREE_ROOT = worktrees;
  const { AgentWorktreeService } = await import(pathToFileURL(modulePath).href);
  const { AgentRunBudgetGuard } = await import(pathToFileURL(budgetModulePath).href);
  const { RegisteredCommandRunner } = await import(pathToFileURL(verificationModulePath).href);
  const { GitWorktreeIntegrator } = await import(pathToFileURL(integrationModulePath).href);
  const { workspaceFingerprint } = await import(pathToFileURL(fingerprintModulePath).href);
  const service = new AgentWorktreeService();

  const toolBudget = new AgentRunBudgetGuard({
    maxDurationSeconds: 60,
    maxFilesChanged: 1,
    maxSubAgents: 1,
    maxToolCalls: 1
  });
  assert.equal(toolBudget.observeActivity("commandExecution"), null);
  assert.match(toolBudget.observeActivity("mcpToolCall"), /tool-call budget/u);
  const fileBudget = new AgentRunBudgetGuard({
    maxDurationSeconds: 60,
    maxFilesChanged: 1,
    maxSubAgents: 1,
    maxToolCalls: 10
  });
  assert.equal(fileBudget.observeFiles(["one.ts"]), null);
  assert.match(fileBudget.observeFiles(["two.ts"]), /changed-file budget/u);

  const source = await service.prepare({
    access: "read-only",
    projectReferenceId: repository,
    projectReferenceType: "workspace",
    runId: "source-test"
  });
  assert.equal(source.mode, "source");
  assert.equal(source.path, repository);

  const workspace = await service.prepare({
    access: "ask-approval",
    projectReferenceId: repository,
    projectReferenceType: "workspace",
    runId: "writable-test"
  });
  assert.equal(workspace.mode, "worktree");
  assert.equal(workspace.branchName, "codex/run-writable-test");
  const firstChild = await service.prepareChild({
    access: "full-access",
    runId: "child-backend",
    sourceRoot: repository
  });
  const secondChild = await service.prepareChild({
    access: "full-access",
    runId: "child-frontend",
    sourceRoot: repository
  });
  assert.notEqual(firstChild.path, secondChild.path);
  assert.equal(firstChild.branchName, "codex/run-child-backend");
  assert.equal(secondChild.branchName, "codex/run-child-frontend");
  await service.cleanup({ ...firstChild, status: "completed" });
  await service.cleanup({ ...secondChild, status: "completed" });

  const readmePath = join(workspace.path, "README.md");
  const original = await readFile(readmePath, "utf8");
  await writeFile(readmePath, `${original}\nChanged by test.\n`, "utf8");
  const changed = await service.inspect(workspace);
  assert.equal(changed.status, "changed");
  assert.deepEqual(changed.changedFiles, ["README.md"]);
  await assert.rejects(
    service.cleanup({ ...workspace, status: "completed" }),
    (error) => error?.code === "AGENT_WORKTREE_DIRTY"
  );
  const runner = new RegisteredCommandRunner();
  const verification = await runner.run(workspace.path, {
    args: ["diff", "--check"],
    command: "git",
    id: "git.diff-check",
    label: "Git whitespace and conflict check",
    required: true,
    timeoutSeconds: 30
  });
  assert.equal(verification.status, "passed");
  const verifiedFingerprint = await workspaceFingerprint(workspace.path);
  await writeFile(readmePath, `${await readFile(readmePath, "utf8")}Changed after verification.\n`, "utf8");
  const changedFingerprint = await workspaceFingerprint(workspace.path);
  assert.notEqual(changedFingerprint, verifiedFingerprint, "A post-verification edit did not change the workspace fingerprint.");
  const unavailableCommand = await runner.run(workspace.path, {
    args: [],
    command: "neot-command-that-does-not-exist",
    id: "missing",
    label: "Missing command",
    required: true,
    timeoutSeconds: 1
  });
  assert.equal(unavailableCommand.status, "failed");
  const integrator = new GitWorktreeIntegrator();
  const commitHash = await integrator.commit(workspace.path, "Verify Agent integration gate");
  assert.match(commitHash, /^[a-f0-9]{40}$/u);
  const clean = await service.inspect(workspace);
  assert.equal(clean.status, "clean");
  await service.cleanup({ ...workspace, status: "completed" });
  const branches = await git(repository, ["branch", "--list", workspace.branchName]);
  assert.match(branches.stdout, /codex\/run-writable-test/u);
  console.info("Agent executor E2E passed: parent isolation, parallel child worktrees, verification, local commit, cleanup, and branch retention verified.");
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}

function git(cwd, args) {
  return execute("git", ["-C", cwd, ...args], { windowsHide: true });
}
