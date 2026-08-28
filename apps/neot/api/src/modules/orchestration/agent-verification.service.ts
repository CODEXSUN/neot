import { spawn } from "node:child_process";
import { AppError } from "@neot/framework/errors";
import { z } from "zod";
import { agentRunRepository } from "./agent-run.repository.js";
import { agentWorktreeService } from "./agent-worktree.service.js";
import { workspaceFingerprint } from "./agent-workspace-fingerprint.js";

const commandSchema = z.object({
  args: z.array(z.string().max(500)).max(30),
  command: z.string().trim().min(1).max(500),
  id: z.string().regex(/^[a-z0-9][a-z0-9.-]*$/u).max(120),
  label: z.string().trim().min(1).max(240),
  required: z.boolean().default(true),
  timeoutSeconds: z.number().int().min(1).max(1_800).default(600)
}).strict();

export type VerificationCommand = z.infer<typeof commandSchema>;

const builtInCommands: VerificationCommand[] = [
  {
    args: ["diff", "--check"],
    command: "git",
    id: "git.diff-check",
    label: "Git whitespace and conflict check",
    required: true,
    timeoutSeconds: 60
  }
];

export class AgentVerificationService {
  constructor(
    private readonly commands: VerificationCommand[] = verificationCommands(),
    private readonly runner = new RegisteredCommandRunner()
  ) {}

  catalog() {
    return this.commands;
  }

  async run(runId: string, actorId: string) {
    const context = await agentRunRepository.verificationContext(runId, actorId);
    requireVerifiable(context);
    await agentWorktreeService.inspect({
      mode: "worktree",
      path: context.workspacePath as string,
      sourceRoot: context.sourceRoot as string
    });
    const { attempt } = await agentRunRepository.startVerification(runId, actorId);
    const results = [];
    for (const definition of this.commands) {
      const result = await this.runner.run(context.workspacePath as string, definition);
      await agentRunRepository.recordVerification(runId, { ...definition, ...result, attempt, commandId: definition.id });
      results.push({ ...definition, ...result });
    }
    const passed = results.every((result) => !result.required || result.status === "passed");
    const fingerprint = passed ? await workspaceFingerprint(context.workspacePath as string) : null;
    await agentRunRepository.finishVerification(runId, actorId, passed, attempt, fingerprint);
    return { attempt, passed, results };
  }
}

export class RegisteredCommandRunner {
  async run(cwd: string, definition: VerificationCommand) {
    const startedAt = Date.now();
    try {
      const output = await execute(definition.command, definition.args, cwd, definition.timeoutSeconds * 1_000);
      return {
        durationMs: Date.now() - startedAt,
        exitCode: output.exitCode,
        status: output.timedOut ? "timed_out" : output.exitCode === 0 ? "passed" : "failed",
        stderr: limit(output.stderr),
        stdout: limit(output.stdout)
      };
    } catch (error) {
      return {
        durationMs: Date.now() - startedAt,
        exitCode: null,
        status: "failed",
        stderr: error instanceof Error ? error.message : "The registered command could not start.",
        stdout: ""
      };
    }
  }
}

function verificationCommands() {
  const configured = process.env.NEOT_AGENT_VERIFICATION_COMMANDS?.trim();
  if (!configured) return builtInCommands;
  let value: unknown;
  try {
    value = JSON.parse(configured);
  } catch {
    throw AppError.validation("NEOT_AGENT_VERIFICATION_COMMANDS must contain a JSON array.");
  }
  const commands = z.array(commandSchema).min(1).max(20).parse(value);
  const ids = new Set(commands.map((command) => command.id));
  if (ids.size !== commands.length) throw AppError.validation("Verification command IDs must be unique.");
  return commands;
}

function requireVerifiable(context: Awaited<ReturnType<typeof agentRunRepository.verificationContext>>) {
  if (context.runStatus !== "completed") {
    throw new AppError({ code: "AGENT_RUN_NOT_COMPLETED", message: "Only a completed Agent run can enter verification.", statusCode: 409 });
  }
  if (context.workspaceMode !== "worktree" || !context.workspacePath || !context.sourceRoot) {
    throw new AppError({ code: "AGENT_WORKTREE_REQUIRED", message: "Verification requires an isolated writable worktree.", statusCode: 409 });
  }
  if (context.workspaceStatus === "cleaned") {
    throw new AppError({ code: "AGENT_WORKTREE_CLEANED", message: "The Agent worktree has already been removed.", statusCode: 409 });
  }
}

function execute(command: string, args: string[], cwd: string, timeoutMs: number) {
  return new Promise<{ exitCode: number | null; stderr: string; stdout: string; timedOut: boolean }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, CI: "1" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    let stderr = "";
    let stdout = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stderr, stdout, timedOut });
    });
  });
}

function limit(value: string) {
  const maximum = 50_000;
  return value.length <= maximum ? value : `${value.slice(0, maximum)}\n[output truncated]`;
}

export const agentVerificationService = new AgentVerificationService();
