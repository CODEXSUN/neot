import type { CodexNotification } from "./codex-app-server.client.js";
import { codexConnectorPool } from "./codex-connector.pool.js";
import type { CodexChatInput } from "./orchestration.schemas.js";
import { skillsRepository } from "../skills/index.js";
import { orchestrationChatRepository } from "./orchestration-chat.repository.js";
import { agentRunRepository } from "./agent-run.repository.js";
import { agentWorktreeService, type AgentWorkspace } from "./agent-worktree.service.js";
import { AgentRunBudgetGuard } from "./agent-run.budget.js";
import {
  chatActionFrom,
  upsertChatAction,
  type OrchestrationChatAction
} from "./orchestration-chat.actions.js";

export type CodexChatEvent =
  | {
      type: "chat.started";
      conversationId: string;
      runId: string;
      threadId: string;
      turnId: string;
    }
  | { type: "chat.delta"; delta: string }
  | { type: "chat.action"; action: OrchestrationChatAction }
  | { type: "chat.files"; files: string[] }
  | { type: "chat.approval"; requestId: number; reason: string; threadId: string }
  | { type: "chat.completed"; messageId: string; status: string }
  | { type: "chat.failed"; message: string };

export class CodexChatService {
  async *stream(input: CodexChatInput, actorId: string): AsyncGenerator<CodexChatEvent> {
    let unsubscribe: (() => boolean) | null = null;
    let conversationId = input.conversationId;
    let assistantText = "";
    let editedFileList: string[] = [];
    let actions: OrchestrationChatAction[] = [];
    let runId: string | null = null;
    let workspace: AgentWorkspace | null = null;
    const startedAt = Date.now();
    const budget = new AgentRunBudgetGuard(undefined, startedAt);
    try {
      const conversation = conversationId
        ? await orchestrationChatRepository.find(conversationId, actorId)
        : await orchestrationChatRepository.create(
            {
              access: input.access,
              connectionId: input.connectionId,
              message: input.message,
              model: input.model,
              projectKey: input.project.key,
              projectTitle: input.project.title,
              projectUuid: input.project.id,
              workItem: input.workItem
            },
            actorId
          );
      conversationId = conversation.uuid;
      if (conversation.projectUuid !== input.project.id) {
        throw new Error("The selected project does not match this chat conversation.");
      }
      if (conversation.connectionId !== input.connectionId) {
        throw new Error("Start a new chat to change the Codex connector.");
      }
      const codexAppServer = codexConnectorPool.client(input.connectionId);
      await orchestrationChatRepository.addMessage(
        {
          actions: [],
          attachments: input.attachments.map(({ name, size }) => ({ name, size })),
          body: input.message,
          durationMs: null,
          files: [],
          role: "user",
          threadUuid: conversationId
        },
        actorId
      );
      runId = await agentRunRepository.create(
        {
          access: input.access,
          chatThreadUuid: conversationId,
          connectionId: input.connectionId,
          message: input.message,
          model: input.model,
          projectKey: input.project.key,
          projectTitle: input.project.title,
          projectUuid: input.project.id
        },
        actorId
      );
      workspace = await agentWorktreeService.prepare({
        access: input.access,
        projectReferenceId: input.project.referenceId,
        projectReferenceType: input.project.referenceType,
        runId
      });
      await agentRunRepository.setWorkspace(runId, actorId, workspace);
      const cwd = workspace.path;
      const threadId =
        conversation.codexThreadId ??
        (await codexAppServer.startThread(cwd, input.model, input.access));
      const queue = new NotificationQueue();
      unsubscribe = codexAppServer.subscribe((message) => {
        if (process.env.CODEX_CHAT_DEBUG === "true") {
          console.info("[codex.chat.notification]", message.method, JSON.stringify(message.params));
        }
        queue.push(message);
      });
      const turnId = await codexAppServer.startTurn(
        threadId,
        cwd,
        await formatInputs(input, workspace, actorId),
        input.model,
        input.access
      );
      await orchestrationChatRepository.updateRuntime(conversationId, actorId, {
        access: input.access,
        codexThreadId: threadId,
        connectionId: input.connectionId,
        model: input.model
      });
      await agentRunRepository.start(runId, actorId, threadId, turnId);
      yield { type: "chat.started", conversationId, runId, threadId, turnId };
      while (true) {
        const notification = await queue.next(budget.remainingDurationMs());
        if (!notification) {
          const message = budget.timeoutViolation();
          await codexAppServer.interruptTurn(threadId, turnId).catch(() => undefined);
          await persistFailure(
            runId,
            actorId,
            conversationId,
            message,
            startedAt,
            editedFileList,
            actions,
            workspace
          );
          yield { type: "chat.failed", message };
          return;
        }
        let event = toChatEvent(notification, threadId, turnId);
        if (!event) continue;
        if (event.type === "chat.delta") assistantText += event.delta;
        let budgetViolation: string | null = null;
        if (event.type === "chat.action") {
          actions = upsertChatAction(actions, event.action);
          await agentRunRepository.activity(runId, actorId, event.action.label);
          if (event.action.status === "running") {
            budgetViolation = budget.observeActivity(event.action.label);
          }
        }
        if (event.type === "chat.files") {
          editedFileList = event.files;
          await agentRunRepository.files(runId, actorId, event.files);
          budgetViolation = budget.observeFiles(event.files);
        }
        if (budgetViolation) {
          await codexAppServer.interruptTurn(threadId, turnId).catch(() => undefined);
          await persistFailure(
            runId,
            actorId,
            conversationId,
            budgetViolation,
            startedAt,
            editedFileList,
            actions,
            workspace
          );
          yield { type: "chat.failed", message: budgetViolation };
          return;
        }
        if (event.type === "chat.approval") {
          await agentRunRepository.requestApproval(runId, actorId, event);
        }
        if (event.type === "chat.completed") {
          const messageId = await orchestrationChatRepository.addMessage(
            {
              actions,
              attachments: [],
              body: assistantText || "No response returned.",
              durationMs: Date.now() - startedAt,
              files: editedFileList,
              role: "assistant",
              threadUuid: conversationId
            },
            actorId
          );
          event = { ...event, messageId };
          await agentRunRepository.complete(
            runId,
            actorId,
            assistantText || "No response returned."
          );
          await finalizeWorkspace(runId, actorId, workspace);
        }
        if (event.type === "chat.failed") {
          await orchestrationChatRepository.addMessage(
            {
              actions,
              attachments: [],
              body: event.message,
              durationMs: Date.now() - startedAt,
              files: editedFileList,
              role: "assistant",
              threadUuid: conversationId
            },
            actorId
          );
          await agentRunRepository.fail(runId, actorId, event.message);
          await finalizeWorkspace(runId, actorId, workspace);
        }
        yield event;
        if (event.type === "chat.completed" || event.type === "chat.failed") return;
      }
    } catch (error) {
      if (runId) {
        await agentRunRepository
          .fail(runId, actorId, error instanceof Error ? error.message : "Codex chat failed.")
          .catch(() => undefined);
        if (workspace) await finalizeWorkspace(runId, actorId, workspace).catch(() => undefined);
      }
      if (conversationId) {
        await orchestrationChatRepository
          .addMessage(
            {
              actions,
              attachments: [],
              body: error instanceof Error ? error.message : "Codex chat failed.",
              durationMs: Date.now() - startedAt,
              files: editedFileList,
              role: "assistant",
              threadUuid: conversationId
            },
            actorId
          )
          .catch(() => undefined);
      }
      yield {
        type: "chat.failed",
        message: error instanceof Error ? error.message : "Codex chat failed."
      };
    } finally {
      unsubscribe?.();
    }
  }
}

class NotificationQueue {
  private readonly values: CodexNotification[] = [];
  private waiting: {
    resolve: (value: CodexNotification | null) => void;
    timer: NodeJS.Timeout;
  } | null = null;

  push(value: CodexNotification) {
    if (this.waiting) {
      const waiting = this.waiting;
      this.waiting = null;
      clearTimeout(waiting.timer);
      waiting.resolve(value);
      return;
    }
    this.values.push(value);
  }

  next(timeoutMs: number) {
    const value = this.values.shift();
    if (value) return Promise.resolve(value);
    if (timeoutMs <= 0) return Promise.resolve(null);
    return new Promise<CodexNotification | null>((resolve) => {
      const timer = setTimeout(() => {
        this.waiting = null;
        resolve(null);
      }, timeoutMs);
      timer.unref();
      this.waiting = { resolve, timer };
    });
  }
}

function toChatEvent(
  notification: CodexNotification,
  threadId: string,
  turnId: string
): CodexChatEvent | null {
  const params = notification.params as Record<string, unknown> | undefined;
  if (params?.threadId !== threadId) return null;
  const action = chatActionFrom(notification, threadId);
  if (action) return { type: "chat.action", action };
  if (typeof notification.id === "number" && notification.method?.includes("requestApproval")) {
    return {
      type: "chat.approval",
      requestId: notification.id,
      reason: approvalReason(notification),
      threadId
    };
  }
  if (notification.method === "item/agentMessage/delta" && typeof params.delta === "string") {
    return { type: "chat.delta", delta: params.delta };
  }
  if (notification.method === "turn/diff/updated" && typeof params.diff === "string") {
    return { type: "chat.files", files: editedFiles(params.diff) };
  }
  if (notification.method === "turn/completed") {
    const turn = params.turn as { id?: string; status?: string; error?: { message?: string } };
    if (turn.id !== turnId) return null;
    if (turn.error?.message) return { type: "chat.failed", message: turn.error.message };
    return { type: "chat.completed", messageId: "", status: turn.status ?? "completed" };
  }
  return null;
}

export function editedFiles(diff: string) {
  const files = new Set<string>();
  for (const match of diff.matchAll(/^\+\+\+\s+b\/(.+)$/gmu)) {
    if (match[1] && match[1] !== "/dev/null") files.add(match[1]);
  }
  for (const match of diff.matchAll(/^---\s+a\/(.+)$/gmu)) {
    if (match[1] && match[1] !== "/dev/null") files.add(match[1]);
  }
  return [...files].sort();
}

async function formatInputs(input: CodexChatInput, workspace: AgentWorkspace, actorId: string) {
  const project = input.project;
  const textAttachments = input.attachments.filter((file) => file.kind === "text");
  const attachments = textAttachments.length
    ? `\n\nAttached files:\n${textAttachments
        .map((file) => `--- ${file.name} (${file.mimeType}) ---\n${file.content}`)
        .join("\n\n")}`
    : "";
  const planInstruction = `\n- Authenticated NEOT actor: ${actorId}${
    input.access === "plan"
      ? "\n- Planning mode: inspect and reason, but return a plan only. Do not modify files."
      : ""
  }`;
  const skillContext = await skillsRepository.promptingContext();
  const skills = skillContext.length
    ? `\n\nNEOT skills:\n${skillContext.map((skill) => `--- ${skill.name} (${skill.review ? "review" : "prompt"}) ---\nSkill root: ${skill.root}\n${skill.content}`).join("\n\n")}`
    : "";
  const workItem = input.workItem
    ? `\n\nSelected work item:\n- ID: ${input.workItem.id}\n- Key: ${input.workItem.key}\n- Kind: ${input.workItem.kind}\n- Title: ${input.workItem.title}\n- Status: ${input.workItem.status}\n- Priority: ${input.workItem.priority}\n- Assignee: ${input.workItem.assignee || "unassigned"}\n- Due date: ${input.workItem.dueDate || "not set"}\n- Parent: ${input.workItem.parentType || "none"} / ${input.workItem.parentId || "none"}\n- Description: ${input.workItem.description || "not provided"}\n\nWorkflow contract:\n1. Treat this work item as the scope anchor and inspect its linked project records before changing code.\n2. Keep implementation, tests, review evidence, and work-item status aligned.\n3. When delivery is complete, update the repository changelog and version using its existing release scripts.\n4. Run the registered verification gates. Never commit until the user approves the commit gate. Never push automatically.`
    : "";
  const prompt = `Project reference:\n- ID: ${project.id}\n- Key: ${project.key}\n- Title: ${project.title}\n- Module: ${project.moduleKey || "not set"}\n- Reference: ${project.referenceType || "not set"} / ${project.referenceId || "not set"}\n- Description: ${project.description || "not provided"}\n- Access: ${input.access}\n- Workspace mode: ${workspace.mode}\n- Branch: ${workspace.branchName || "source checkout"}\n- Base revision: ${workspace.baseRevision}${planInstruction}${workItem}\n\nUser message:\n${input.message}${attachments}${skills}`;
  return [
    { type: "text" as const, text: prompt },
    ...input.attachments
      .filter((file) => file.kind === "image")
      .map((file) => ({ type: "image" as const, url: file.content }))
  ];
}

async function finalizeWorkspace(runId: string, actorId: string, workspace: AgentWorkspace) {
  try {
    const inspection = await agentWorktreeService.inspect(workspace);
    await agentRunRepository.setWorkspaceStatus(runId, actorId, inspection.status);
    if (inspection.changedFiles.length)
      await agentRunRepository.files(runId, actorId, inspection.changedFiles);
  } catch {
    await agentRunRepository
      .setWorkspaceStatus(runId, actorId, "inspection_failed")
      .catch(() => undefined);
  }
}

async function persistFailure(
  runId: string,
  actorId: string,
  conversationId: string,
  message: string,
  startedAt: number,
  files: string[],
  actions: OrchestrationChatAction[],
  workspace: AgentWorkspace
) {
  await orchestrationChatRepository.addMessage(
    {
      actions,
      attachments: [],
      body: message,
      durationMs: Date.now() - startedAt,
      files,
      role: "assistant",
      threadUuid: conversationId
    },
    actorId
  );
  await agentRunRepository.fail(runId, actorId, message);
  await finalizeWorkspace(runId, actorId, workspace);
}

function approvalReason(notification: CodexNotification) {
  const params = notification.params as { command?: string; reason?: string } | undefined;
  return (
    params?.reason ||
    params?.command ||
    "Codex wants to perform an action outside the current boundary."
  );
}
