import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { basename, delimiter, join, relative, resolve, sep } from "node:path";
import { AppError } from "@neot/framework/errors";
import type { AgentAccessMode } from "./agent-run.policy.js";

export type AgentWorkspace = {
  baseRevision: string;
  branchName: string | null;
  mode: "source" | "worktree";
  path: string;
  sourceRoot: string;
  status: "clean" | "source";
};

export class AgentWorktreeService {
  async prepare(input: {
    access: AgentAccessMode;
    projectReferenceId: string;
    projectReferenceType: string;
    runId: string;
  }): Promise<AgentWorkspace> {
    const sourceRoot = await this.resolveSourceRoot(input.projectReferenceId, input.projectReferenceType);
    const baseRevision = await git(sourceRoot, ["rev-parse", "HEAD"]);
    if (!needsWorktree(input.access)) {
      return { baseRevision, branchName: null, mode: "source", path: sourceRoot, sourceRoot, status: "source" };
    }
    const root = worktreeRoot();
    await mkdir(root, { recursive: true });
    const branchName = `codex/run-${input.runId}`;
    const target = resolve(root, safeSegment(basename(sourceRoot)), input.runId);
    requireInside(root, target);
    await git(sourceRoot, ["worktree", "add", "-b", branchName, target, baseRevision], 60_000);
    return { baseRevision, branchName, mode: "worktree", path: target, sourceRoot, status: "clean" };
  }

  async prepareChild(input: { access: AgentAccessMode; runId: string; sourceRoot: string }) {
    const sourceRoot = resolve(input.sourceRoot);
    if (!allowedRoots().some((allowed) => contains(allowed, sourceRoot))) {
      throw new AppError({ code: "AGENT_REPOSITORY_NOT_ALLOWED", message: "The parent repository is outside NEOT_AGENT_ALLOWED_ROOTS.", statusCode: 403 });
    }
    const baseRevision = await git(sourceRoot, ["rev-parse", "HEAD"]);
    if (!needsWorktree(input.access)) {
      return { baseRevision, branchName: null, mode: "source" as const, path: sourceRoot, sourceRoot, status: "source" as const };
    }
    const root = worktreeRoot();
    await mkdir(root, { recursive: true });
    const branchName = `codex/run-${input.runId}`;
    const target = resolve(root, safeSegment(basename(sourceRoot)), input.runId);
    requireInside(root, target);
    await git(sourceRoot, ["worktree", "add", "-b", branchName, target, baseRevision], 60_000);
    return { baseRevision, branchName, mode: "worktree" as const, path: target, sourceRoot, status: "clean" as const };
  }

  async inspect(workspace: Pick<AgentWorkspace, "mode" | "path" | "sourceRoot">) {
    if (workspace.mode !== "worktree") return { changedFiles: [], clean: true, status: "source" as const };
    this.requireManagedPath(workspace.path);
    const output = await git(workspace.path, ["status", "--porcelain=v1"]);
    const changedFiles = output.split(/\r?\n/gu).filter(Boolean).map((line) => line.slice(3).trim());
    return { changedFiles, clean: changedFiles.length === 0, status: changedFiles.length ? "changed" as const : "clean" as const };
  }

  async cleanup(workspace: {
    branchName: string | null;
    mode: string;
    path: string | null;
    sourceRoot: string | null;
    status: string;
  }) {
    if (workspace.mode !== "worktree" || !workspace.path || !workspace.sourceRoot || !workspace.branchName) {
      throw AppError.validation("This Agent run does not own an isolated worktree.");
    }
    if (!isTerminal(workspace.status)) {
      throw new AppError({ code: "AGENT_WORKTREE_ACTIVE", message: "Wait for the Agent run to finish before cleanup.", statusCode: 409 });
    }
    this.requireManagedPath(workspace.path);
    await this.requireRegisteredWorktree(workspace.sourceRoot, workspace.path, workspace.branchName);
    const inspection = await this.inspect({ mode: "worktree", path: workspace.path, sourceRoot: workspace.sourceRoot });
    if (!inspection.clean) {
      throw new AppError({
        code: "AGENT_WORKTREE_DIRTY",
        message: "The worktree contains changes. Review or commit them before cleanup.",
        statusCode: 409
      });
    }
    await git(workspace.sourceRoot, ["worktree", "remove", workspace.path], 60_000);
    return { branchName: workspace.branchName, cleaned: true, path: workspace.path };
  }

  private async resolveSourceRoot(referenceId: string, referenceType: string) {
    const usesReference = ["git", "repository", "workspace"].includes(referenceType.trim().toLowerCase()) && referenceId.trim();
    const candidate = resolve(usesReference ? referenceId.trim() : process.cwd());
    const details = await stat(candidate).catch(() => null);
    if (!details?.isDirectory()) throw AppError.validation("The project repository path does not exist.");
    const root = resolve(await git(candidate, ["rev-parse", "--show-toplevel"]));
    if (!allowedRoots().some((allowed) => contains(allowed, root))) {
      throw new AppError({
        code: "AGENT_REPOSITORY_NOT_ALLOWED",
        message: "The project repository is outside NEOT_AGENT_ALLOWED_ROOTS.",
        statusCode: 403
      });
    }
    return root;
  }

  private requireManagedPath(path: string) {
    requireInside(worktreeRoot(), resolve(path));
  }

  private async requireRegisteredWorktree(sourceRoot: string, path: string, branchName: string) {
    const output = await git(sourceRoot, ["worktree", "list", "--porcelain"]);
    const blocks = output.split(/\r?\n\r?\n/gu);
    const registered = blocks.some((block) => {
      const lines = block.split(/\r?\n/gu);
      return samePath(lines.find((line) => line.startsWith("worktree "))?.slice(9) ?? "", path) &&
        lines.includes(`branch refs/heads/${branchName}`);
    });
    if (!registered) throw AppError.validation("The worktree registration does not match this Agent run.");
  }
}

async function git(cwd: string, args: string[], timeoutMs = 15_000) {
  const result = await execute("git", ["-C", cwd, ...args], timeoutMs);
  if (result.exitCode !== 0) {
    throw new AppError({ code: "AGENT_GIT_FAILED", message: result.stderr.trim() || "Git command failed.", statusCode: 409 });
  }
  return result.stdout.trimEnd();
}

function execute(command: string, args: string[], timeoutMs: number) {
  return new Promise<{ exitCode: number; stderr: string; stdout: string }>((resolveResult, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (code) => { clearTimeout(timer); resolveResult({ exitCode: code ?? -1, stderr, stdout }); });
  });
}

function allowedRoots() {
  const configured = process.env.NEOT_AGENT_ALLOWED_ROOTS?.trim();
  return (configured ? configured.split(delimiter) : [process.cwd()]).filter(Boolean).map((path) => resolve(path));
}

function worktreeRoot() {
  const configured = process.env.NEOT_AGENT_WORKTREE_ROOT?.trim();
  if (configured) return resolve(configured);
  const applicationData = process.env.LOCALAPPDATA?.trim();
  if (applicationData) return resolve(applicationData, "NEOT", "NEOT", "worktrees");
  return resolve(process.env.NEOT_STORAGE_PATH?.trim() || join(process.cwd(), "storage", "neot"), "agent-worktrees");
}

function requireInside(root: string, target: string) {
  if (!contains(root, target) || samePath(root, target)) throw AppError.validation("Agent worktree path is outside the managed root.");
}

function contains(root: string, target: string) {
  const path = relative(resolve(root), resolve(target));
  return path === "" || (!path.startsWith("..") && !path.includes(`..${sep}`));
}

function samePath(left: string, right: string) {
  const normalize = (value: string) => resolve(value).replaceAll("\\", "/").toLowerCase();
  return normalize(left) === normalize(right);
}

function safeSegment(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/gu, "-").replace(/^-|-$/gu, "") || "repository"; }
function needsWorktree(access: AgentAccessMode) { return access === "ask-approval" || access === "auto-approve" || access === "full-access"; }
function isTerminal(status: string) { return status === "cancelled" || status === "completed" || status === "failed"; }

export const agentWorktreeService = new AgentWorktreeService();
