import type { CodexAppServerClient, CodexNotification } from "./codex-app-server.client.js";
import { codexConnectorPool } from "./codex-connector.pool.js";
import { AgentRunBudgetGuard } from "./agent-run.budget.js";
import { agentRunRepository } from "./agent-run.repository.js";
import { agentTaskGraphRepository } from "./agent-task-graph.repository.js";
import { agentWorktreeService } from "./agent-worktree.service.js";

export class AgentDelegateExecutor {
  private readonly active = new Set<string>();
  private recovery: Promise<number> | null = null;

  async call(taskUuid: string, actorId: string) {
    const graph = await agentTaskGraphRepository.start(taskUuid, actorId);
    this.dispatch(taskUuid, actorId, false);
    return graph;
  }

  async recover() {
    const tasks = await agentTaskGraphRepository.recoverable();
    let recovered = 0;
    for (const task of tasks) {
      if (!this.dispatch(task.taskUuid, task.actorId, true)) continue;
      await agentTaskGraphRepository.recordRecovery(task.taskUuid, task.actorId);
      recovered += 1;
    }
    return recovered;
  }

  recoverOnce() {
    if (!this.recovery) {
      this.recovery = this.recover().catch((error: unknown) => {
        this.recovery = null;
        throw error;
      });
    }
    return this.recovery;
  }

  private dispatch(taskUuid: string, actorId: string, recovering: boolean) {
    if (this.active.has(taskUuid)) return false;
    this.active.add(taskUuid);
    void this.execute(taskUuid, actorId, recovering).finally(() => this.active.delete(taskUuid));
    return true;
  }

  private async execute(taskUuid: string, actorId: string, recovering: boolean) {
    let context: ExecutionContext | null = null;
    const queue = new NotificationQueue();
    const budget = new AgentRunBudgetGuard();
    let threadId = "";
    let turnId = "";
    let response = "";
    let codexAppServer: CodexAppServerClient | null = null;
    let unsubscribe = () => false;
    try {
      context = await agentTaskGraphRepository.executionContext(taskUuid, actorId);
      const activeContext = context;
      const connectionId = await codexConnectorPool.nextConnected(
        recovering ? activeContext.connectionId : undefined
      );
      await agentRunRepository.setConnection(activeContext.childRunUuid, actorId, connectionId);
      codexAppServer = codexConnectorPool.client(connectionId);
      unsubscribe = codexAppServer.subscribe((notification) => queue.push(notification));
      threadId = await codexAppServer.startThread(
        activeContext.workspace.path,
        activeContext.model,
        activeContext.access
      );
      turnId = await codexAppServer.startTurn(
        threadId,
        activeContext.workspace.path,
        [{ type: "text", text: prompt(activeContext) }],
        activeContext.model,
        activeContext.access
      );
      if (recovering)
        await agentRunRepository.recover(activeContext.childRunUuid, actorId, threadId, turnId);
      else await agentRunRepository.start(activeContext.childRunUuid, actorId, threadId, turnId);
      while (true) {
        const notification = await queue.next(budget.remainingDurationMs());
        if (!notification) throw new Error(budget.timeoutViolation());
        const event = delegateEvent(notification, threadId, turnId);
        if (!event) continue;
        if (event.type === "delta") response += event.value;
        if (event.type === "activity") {
          await agentRunRepository.activity(activeContext.childRunUuid, actorId, event.value);
          const violation = budget.observeActivity(event.value);
          if (violation) throw new Error(violation);
        }
        if (event.type === "files") {
          await agentRunRepository.files(activeContext.childRunUuid, actorId, event.value);
          const violation = budget.observeFiles(event.value);
          if (violation) throw new Error(violation);
        }
        if (event.type === "approval") {
          await agentRunRepository.requestApproval(activeContext.childRunUuid, actorId, {
            reason: event.reason,
            requestId: event.requestId,
            threadId
          });
        }
        if (event.type === "failed") throw new Error(event.value);
        if (event.type === "completed") break;
      }
      const inspection = await agentWorktreeService.inspect(activeContext.workspace);
      const outOfScope = inspection.changedFiles.filter(
        (file) => !inScope(file, activeContext.scopePaths)
      );
      if (outOfScope.length) {
        throw new Error(
          `Delegate changed files outside its assigned scope: ${outOfScope.join(", ")}`
        );
      }
      if (
        requiresChanges(activeContext.persona.agentProfile) &&
        inspection.changedFiles.length === 0
      ) {
        const explanation = response.trim() ? ` Delegate response: ${response.trim()}` : "";
        throw new Error(
          `${activeContext.persona.name} completed without changing a file in the assigned scope.${explanation}`
        );
      }
      if (inspection.changedFiles.length) {
        await agentRunRepository.files(
          activeContext.childRunUuid,
          actorId,
          inspection.changedFiles
        );
      }
      await agentRunRepository.setWorkspaceStatus(
        activeContext.childRunUuid,
        actorId,
        inspection.status
      );
      await agentTaskGraphRepository.finish(
        taskUuid,
        actorId,
        "completed",
        response.trim() || `${activeContext.persona.name} completed the assigned task.`
      );
    } catch (error) {
      if (codexAppServer && threadId && turnId) {
        await codexAppServer.interruptTurn(threadId, turnId).catch(() => undefined);
      }
      const message = error instanceof Error ? error.message : "The named delegate failed.";
      await agentTaskGraphRepository
        .finish(taskUuid, actorId, "failed", message)
        .catch(async () => {
          if (context)
            await agentRunRepository
              .fail(context.childRunUuid, actorId, message)
              .catch(() => undefined);
        });
    } finally {
      unsubscribe();
    }
  }
}

type ExecutionContext = Awaited<ReturnType<typeof agentTaskGraphRepository.executionContext>>;
type DelegateEvent =
  | { type: "activity" | "delta" | "failed"; value: string }
  | { type: "files"; value: string[] }
  | { type: "approval"; reason: string; requestId: number }
  | { type: "completed" };

function prompt(context: ExecutionContext) {
  return `You are ${context.persona.name}, a named ${context.persona.role} in the NEOT Project Agent team.

Profile: ${context.persona.agentProfile}
Project: ${context.projectKey} - ${context.projectTitle}
Assigned task: ${context.taskTitle}
Task objective: ${context.objective}
Allowed file scope:
${context.scopePaths.map((path) => `- ${path}`).join("\n")}
${context.dependencies.length ? `\nCompleted dependency evidence:\n${context.dependencies.map((dependency) => `- ${dependency.title}: ${dependency.resultSummary || "No summary"}\n  Review workspace: ${dependency.workspacePath || "not available"}`).join("\n")}` : ""}

Delegate instructions:
${context.persona.instructions}

Execution contract:
1. Treat the assigned task as your active instruction.
2. Read repository instructions before acting.
3. Work only inside the allowed file scope. Do not modify any other path.
4. Inspect existing code before editing and make the smallest complete change.
5. Run focused verification and report exact evidence.
6. Do not commit, push, deploy, change secrets, or broaden permissions.
7. Finish with a concise result, changed files, checks, and remaining risks.`;
}

function delegateEvent(
  notification: CodexNotification,
  threadId: string,
  turnId: string
): DelegateEvent | null {
  const params = notification.params as Record<string, unknown> | undefined;
  if (params?.threadId !== threadId) return null;
  if (typeof notification.id === "number" && notification.method?.includes("requestApproval")) {
    const approval = params as { command?: string; reason?: string };
    return {
      type: "approval",
      reason: approval.reason || approval.command || "Delegate requests approval.",
      requestId: notification.id
    };
  }
  if (notification.method === "item/agentMessage/delta" && typeof params.delta === "string")
    return { type: "delta", value: params.delta };
  if (notification.method === "item/started") {
    const item = params.item as { type?: string } | undefined;
    if (item?.type && item.type !== "agentMessage") return { type: "activity", value: item.type };
  }
  if (notification.method === "turn/diff/updated" && typeof params.diff === "string")
    return { type: "files", value: editedFiles(params.diff) };
  if (notification.method === "turn/completed") {
    const turn = params.turn as { id?: string; error?: { message?: string } };
    if (turn.id !== turnId) return null;
    return turn.error?.message
      ? { type: "failed", value: turn.error.message }
      : { type: "completed" };
  }
  return null;
}

function editedFiles(diff: string) {
  const files = new Set<string>();
  for (const match of diff.matchAll(/^(?:\+\+\+\s+b\/|---\s+a\/)(.+)$/gmu)) {
    if (match[1] && match[1] !== "/dev/null") files.add(match[1]);
  }
  return [...files].sort();
}

function inScope(file: string, scopes: string[]) {
  const normalized = file.replaceAll("\\", "/").replace(/^\.\//u, "");
  return scopes.some(
    (scope) => normalized === scope || normalized.startsWith(`${scope.replace(/\/$/u, "")}/`)
  );
}

function requiresChanges(profile: string) {
  return ["coding", "design", "documentation"].includes(profile);
}

class NotificationQueue {
  private readonly values: CodexNotification[] = [];
  private waiting: ((value: CodexNotification | null) => void) | null = null;

  push(value: CodexNotification) {
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve(value);
    } else this.values.push(value);
  }

  next(timeoutMs: number) {
    const value = this.values.shift();
    if (value) return Promise.resolve(value);
    return new Promise<CodexNotification | null>((resolve) => {
      const timer = setTimeout(() => {
        this.waiting = null;
        resolve(null);
      }, timeoutMs);
      timer.unref();
      this.waiting = (notification) => {
        clearTimeout(timer);
        resolve(notification);
      };
    });
  }
}

export const agentDelegateExecutor = new AgentDelegateExecutor();
