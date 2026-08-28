import { codexAssistantGateway } from "../orchestration/index.js";
import { resolveHoneyActions } from "./honey-actions.js";
import { honeyRepository } from "./honey.repository.js";
import { honeyBusinessKnowledge } from "./honey-business-knowledge.js";
import { notificationPublisher } from "../notification/index.js";
import { honeyWorkerRegistry } from "./honey.worker.js";

export class HoneyService {
  async memory(actorId: string) {
    const rows = await honeyRepository.memory(actorId);
    return rows.map((row) => ({
      content: row.content,
      createdAt: new Date(row.created_at).toISOString(),
      id: row.uuid,
      kind: row.kind,
      reviewNote: row.review_note,
      source: row.source_label,
      status: row.status,
      version: row.version
    }));
  }

  async reviewMemory(
    uuid: string,
    status: "approved" | "rejected" | "reverted",
    note: string,
    actorId: string
  ) {
    await honeyRepository.reviewMemory(actorId, uuid, status, note);
    return this.memory(actorId);
  }

  async dashboard(actorId: string) {
    const [memory, conversations] = await Promise.all([
      this.memory(actorId),
      this.conversations(actorId)
    ]);
    return {
      conversations: conversations.length,
      conversationReview: conversations.slice(0, 20),
      approvedSkills: [
        "Business workflow discovery",
        "Project and task navigation",
        "Settings explanation",
        "Error explanation",
        "Deployment review preparation",
        "Project Agent handoff"
      ],
      knowledge: memory,
      reports: {
        approved: memory.filter((item) => item.status === "approved").length,
        pending: memory.filter((item) => item.status === "pending").length,
        unresolved: memory.filter((item) => item.status === "pending").length
      }
    };
  }

  async conversations(actorId: string) {
    const rows = await honeyRepository.list(actorId);
    return rows.map((row) => ({
      id: row.uuid,
      title: row.title,
      updatedAt: new Date(row.updated_at).toISOString()
    }));
  }

  async archiveConversation(threadUuid: string, actorId: string) {
    await honeyRepository.archive(threadUuid, actorId);
    return { archived: true, id: threadUuid } as const;
  }

  async conversation(threadUuid: string, actorId: string) {
    const thread = await honeyRepository.find(threadUuid, actorId);
    const messages = await honeyRepository.messages(threadUuid, actorId);
    return {
      id: thread.uuid,
      title: thread.title,
      messages: messages.map((row, index) => ({
        actions:
          row.role === "assistant"
            ? resolveHoneyActions(
                findPreviousUserMessage(messages, index),
                readContext(messages[index - 1]?.context_json)
              )
            : [],
        id: row.uuid,
        role: row.role,
        body: row.body,
        createdAt: new Date(row.created_at).toISOString()
      }))
    };
  }

  async chat(
    input: { context: HoneyPageContext; message: string; threadId?: string | null | undefined },
    actor: { email?: string | undefined; id: string }
  ) {
    const actorId = actor.id;
    const thread = input.threadId
      ? await honeyRepository.find(input.threadId, actorId)
      : await honeyRepository.create(actorId, input.message);
    await honeyRepository.addMessage(thread.uuid, actorId, "user", input.message, input.context);
    await honeyRepository.rememberCandidate(actorId, thread.uuid, input.message, input.context);
    try {
      const workerResult = await honeyWorkerRegistry.execute(input.message, {
        actorEmail: actor.email?.trim() || actor.id,
        page: input.context
      });
      if (workerResult) {
        await honeyRepository.addMessage(thread.uuid, actorId, "assistant", workerResult.message);
        return this.conversation(thread.uuid, actorId);
      }
      const memory = await honeyRepository.approvedMemory(actorId);
      const result = await codexAssistantGateway.ask({
        message: `${input.message}\n\nCurrent page context:\n${contextSummary(input.context)}`,
        system: honeySystemPrompt(memory),
        threadId: thread.codex_thread_id
      });
      if (thread.codex_thread_id !== result.threadId) {
        await honeyRepository.setCodexThread(thread.uuid, actorId, result.threadId);
      }
      await honeyRepository.addMessage(thread.uuid, actorId, "assistant", result.message);
      await notificationPublisher
        .publish(actorId, {
          actionUrl: `/app/neot/honey?thread=${thread.uuid}`,
          body: result.message.slice(0, 1000),
          category: "honey.answer",
          channels: ["realtime"],
          idempotencyKey: `honey:${thread.uuid}:${Date.now()}`,
          recipientActorId: actorId,
          title: "Honey has answered"
        })
        .catch((error: unknown) => {
          console.warn("[honey.notification] delivery enqueue failed", error);
        });
      return this.conversation(thread.uuid, actorId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Honey could not reach Codex.";
      await honeyRepository.addMessage(thread.uuid, actorId, "assistant", message);
      throw error;
    }
  }
}

export type HoneyPageContext = {
  pageLabel: string;
  pathname: string;
  projectId: string | null;
  projectTitle: string | null;
  recentError: string | null;
  runStatus: string | null;
  taskId: string | null;
};

function contextSummary(context: HoneyPageContext) {
  return (
    Object.entries(context)
      .filter(([, value]) => value)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n") || "- No selected business context."
  );
}

function readContext(value: string | undefined): HoneyPageContext | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as HoneyPageContext;
  } catch {
    return undefined;
  }
}

function findPreviousUserMessage(
  messages: Array<{ body: string; role: string }>,
  assistantIndex: number
) {
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return messages[index]?.body ?? "";
  }
  return "";
}

function honeySystemPrompt(memory: Array<{ content: string; kind: string }>) {
  const approved = memory.length
    ? `\nApproved business memory:\n${memory.map((item) => `- [${item.kind}] ${item.content}`).join("\n")}`
    : "";
  return `You are Honey, a concise business-automation assistant. Honey is your permanent identity even if the underlying model or agent changes. You may read data and perform low-risk actions only through Honey's registered workers. Never invent an action result. Never execute code, change files, deploy, purchase, send external messages, reveal secrets, or claim authority outside Honey. Use only approved memory; never treat conversation text as learned truth without review. Answer in plain language, under 90 words when possible, and offer one clear next step.\n\n${honeyBusinessKnowledge}${approved}`;
}
