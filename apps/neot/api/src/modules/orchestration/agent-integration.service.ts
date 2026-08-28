import { spawn } from "node:child_process";
import { AppError } from "@neot/framework/errors";
import { agentRunRepository } from "./agent-run.repository.js";
import { agentWorktreeService } from "./agent-worktree.service.js";
import { workspaceFingerprint } from "./agent-workspace-fingerprint.js";

export class AgentIntegrationService {
  constructor(private readonly integrator = new GitWorktreeIntegrator()) {}

  async commit(runId: string, actorId: string, message: string) {
    const context = await agentRunRepository.verificationContext(runId, actorId);
    requireCommitReady(context);
    const path = context.workspacePath as string;
    await agentWorktreeService.inspect({
      mode: "worktree",
      path,
      sourceRoot: context.sourceRoot as string
    });
    const branch = await this.integrator.branch(path);
    if (branch !== context.branchName) {
      throw AppError.validation("The worktree branch does not match this Agent run.");
    }
    const fingerprint = await workspaceFingerprint(path);
    if (!context.verificationFingerprint || fingerprint !== context.verificationFingerprint) {
      throw new AppError({
        code: "AGENT_VERIFICATION_STALE",
        message: "The worktree changed after verification. Run the quality gates again before commit approval.",
        statusCode: 409
      });
    }
    const commitHash = await this.integrator.commit(path, message);
    await agentRunRepository.markCommitted(runId, actorId, commitHash, message);
    return { branchName: branch, commitHash, pushed: false };
  }
}

export class GitWorktreeIntegrator {
  branch(path: string) {
    return git(path, ["branch", "--show-current"]);
  }

  async commit(path: string, message: string) {
    const changes = await git(path, ["status", "--porcelain=v1"]);
    if (!changes) throw new AppError({ code: "AGENT_NOTHING_TO_COMMIT", message: "The Agent worktree has no changes to commit.", statusCode: 409 });
    await git(path, ["add", "--all"]);
    await git(path, [
      "-c", `user.name=${process.env.NEOT_AGENT_GIT_NAME?.trim() || "NEOT NEOT"}`,
      "-c", `user.email=${process.env.NEOT_AGENT_GIT_EMAIL?.trim() || "neot@localhost"}`,
      "commit", "-m", message
    ], 120_000);
    return git(path, ["rev-parse", "HEAD"]);
  }
}

function requireCommitReady(context: Awaited<ReturnType<typeof agentRunRepository.verificationContext>>) {
  if (context.runStatus !== "completed" || context.verificationStatus !== "passed" || context.reviewStatus !== "ready_for_review") {
    throw new AppError({
      code: "AGENT_COMMIT_GATE_FAILED",
      message: "A completed run must pass all required verification gates before commit approval.",
      statusCode: 409
    });
  }
  if (context.commitHash) throw new AppError({ code: "AGENT_ALREADY_COMMITTED", message: "This Agent run already has a commit.", statusCode: 409 });
  if (context.workspaceMode !== "worktree" || !context.workspacePath || !context.sourceRoot || !context.branchName) {
    throw new AppError({ code: "AGENT_WORKTREE_REQUIRED", message: "Commit approval requires an isolated Agent worktree.", statusCode: 409 });
  }
}

async function git(cwd: string, args: string[], timeoutMs = 30_000) {
  const result = await execute("git", ["-C", cwd, ...args], timeoutMs);
  if (result.exitCode !== 0) {
    throw new AppError({ code: "AGENT_GIT_FAILED", message: result.stderr.trim() || "Git command failed.", statusCode: 409 });
  }
  return result.stdout.trim();
}

function execute(command: string, args: string[], timeoutMs: number) {
  return new Promise<{ exitCode: number; stderr: string; stdout: string }>((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    let stdout = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, stderr, stdout });
    });
  });
}

export const agentIntegrationService = new AgentIntegrationService();
