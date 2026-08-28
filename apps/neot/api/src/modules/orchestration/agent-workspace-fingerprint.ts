import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { AppError } from "@neot/framework/errors";

export async function workspaceFingerprint(workspacePath: string) {
  const diff = await git(workspacePath, ["diff", "HEAD", "--binary", "--no-ext-diff"]);
  const untrackedOutput = await git(workspacePath, ["ls-files", "--others", "--exclude-standard", "-z"]);
  const untracked = untrackedOutput.split("\0").filter(Boolean).sort();
  const hash = createHash("sha256").update(diff);
  for (const path of untracked) {
    const absolutePath = resolve(workspacePath, path);
    const scope = relative(resolve(workspacePath), absolutePath);
    if (scope.startsWith("..") || resolve(workspacePath) === absolutePath) {
      throw AppError.validation("An untracked verification path is outside the Agent worktree.");
    }
    hash.update("\0").update(path).update("\0").update(await readFile(absolutePath));
  }
  return hash.digest("hex");
}

async function git(cwd: string, args: string[]) {
  const result = await execute("git", ["-C", cwd, ...args]);
  if (result.exitCode !== 0) {
    throw new AppError({ code: "AGENT_GIT_FAILED", message: result.stderr.trim() || "Git command failed.", statusCode: 409 });
  }
  return result.stdout;
}

function execute(command: string, args: string[]) {
  return new Promise<{ exitCode: number; stderr: string; stdout: string }>((resolveResult, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (code) => resolveResult({ exitCode: code ?? -1, stderr, stdout }));
  });
}
