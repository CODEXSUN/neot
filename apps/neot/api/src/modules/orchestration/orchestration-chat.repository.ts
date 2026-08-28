import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import type { Selectable } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type {
  OrchestrationChatMessagesTable,
  OrchestrationChatThreadsTable
} from "../../database/schema.js";
import type { OrchestrationChatAction } from "./orchestration-chat.actions.js";

export class OrchestrationChatRepository {
  private readonly database = getNEOTDatabase();

  async list(actorId: string) {
    const rows = await this.database
      .selectFrom("neot_orchestration_chat_threads")
      .selectAll()
      .where("actor_id", "=", actorId)
      .where("status", "=", "active")
      .orderBy("updated_at", "desc")
      .limit(50)
      .execute();
    return rows.map(mapThread);
  }

  async find(uuid: string, actorId: string) {
    const row = await this.requireThread(uuid, actorId);
    const messages = await this.database
      .selectFrom("neot_orchestration_chat_messages")
      .selectAll()
      .where("thread_uuid", "=", uuid)
      .where("actor_id", "=", actorId)
      .orderBy("created_at", "asc")
      .execute();
    return { ...mapThread(row), messages: messages.map(mapMessage) };
  }

  async create(
    input: {
      access: string;
      connectionId: string;
      message: string;
      model: string;
      projectKey: string;
      projectTitle: string;
      projectUuid: string;
      workItem: { id: string; key: string; kind: string; title: string } | null;
    },
    actorId: string
  ) {
    const uuid = randomBytes(8).toString("hex");
    await this.database
      .insertInto("neot_orchestration_chat_threads")
      .values({
        access_mode: input.access,
        actor_id: actorId,
        codex_thread_id: null,
        connection_id: input.connectionId,
        model: input.model,
        project_key: input.projectKey,
        project_title: input.projectTitle,
        project_uuid: input.projectUuid,
        work_item_key: input.workItem?.key ?? null,
        work_item_kind: input.workItem?.kind ?? null,
        work_item_title: input.workItem?.title ?? null,
        work_item_uuid: input.workItem?.id ?? null,
        status: "active",
        title: compactTitle(input.message),
        uuid
      })
      .executeTakeFirstOrThrow();
    return this.find(uuid, actorId);
  }

  async updateRuntime(
    uuid: string,
    actorId: string,
    input: { access: string; codexThreadId: string; connectionId: string; model: string }
  ) {
    await this.requireThread(uuid, actorId);
    await this.database
      .updateTable("neot_orchestration_chat_threads")
      .set({
        access_mode: input.access,
        codex_thread_id: input.codexThreadId,
        connection_id: input.connectionId,
        model: input.model,
        updated_at: new Date()
      })
      .where("uuid", "=", uuid)
      .where("actor_id", "=", actorId)
      .executeTakeFirst();
  }

  async addMessage(
    input: {
      actions: OrchestrationChatAction[];
      attachments: Array<{ name: string; size: number }>;
      body: string;
      durationMs: number | null;
      files: string[];
      role: "assistant" | "user";
      threadUuid: string;
    },
    actorId: string
  ) {
    await this.requireThread(input.threadUuid, actorId);
    const uuid = randomBytes(8).toString("hex");
    await this.database
      .insertInto("neot_orchestration_chat_messages")
      .values({
        actions_json: JSON.stringify(input.actions),
        actor_id: actorId,
        attachments_json: JSON.stringify(input.attachments),
        body: input.body,
        duration_ms: input.durationMs,
        feedback: null,
        files_json: JSON.stringify(input.files),
        role: input.role,
        thread_uuid: input.threadUuid,
        uuid
      })
      .executeTakeFirstOrThrow();
    await this.database
      .updateTable("neot_orchestration_chat_threads")
      .set({ updated_at: new Date() })
      .where("uuid", "=", input.threadUuid)
      .where("actor_id", "=", actorId)
      .executeTakeFirst();
    return uuid;
  }

  async setFeedback(messageUuid: string, feedback: "down" | "up" | null, actorId: string) {
    const result = await this.database
      .updateTable("neot_orchestration_chat_messages")
      .set({ feedback, updated_at: new Date() })
      .where("uuid", "=", messageUuid)
      .where("actor_id", "=", actorId)
      .where("role", "=", "assistant")
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) throw AppError.notFound("Chat message was not found.");
    return { feedback, messageUuid };
  }

  async archive(uuid: string, actorId: string) {
    await this.requireThread(uuid, actorId);
    await this.database
      .updateTable("neot_orchestration_chat_threads")
      .set({ status: "archived", updated_at: new Date() })
      .where("uuid", "=", uuid)
      .where("actor_id", "=", actorId)
      .executeTakeFirst();
    return { archived: true, uuid };
  }

  private async requireThread(uuid: string, actorId: string) {
    const row = await this.database
      .selectFrom("neot_orchestration_chat_threads")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("actor_id", "=", actorId)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Chat conversation was not found.");
    return row;
  }
}

function mapThread(row: Selectable<OrchestrationChatThreadsTable>) {
  return {
    access: row.access_mode,
    codexThreadId: row.codex_thread_id,
    connectionId: row.connection_id,
    createdAt: new Date(row.created_at).toISOString(),
    model: row.model,
    projectKey: row.project_key,
    projectTitle: row.project_title,
    projectUuid: row.project_uuid,
    workItem: row.work_item_uuid
      ? {
          id: row.work_item_uuid,
          key: row.work_item_key ?? "",
          kind: row.work_item_kind ?? "",
          title: row.work_item_title ?? ""
        }
      : null,
    title: row.title,
    updatedAt: new Date(row.updated_at).toISOString(),
    uuid: row.uuid
  };
}

function mapMessage(row: Selectable<OrchestrationChatMessagesTable>) {
  return {
    actions: JSON.parse(row.actions_json) as OrchestrationChatAction[],
    attachments: JSON.parse(row.attachments_json) as Array<{ name: string; size: number }>,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    durationMs: row.duration_ms,
    feedback: row.feedback === "up" || row.feedback === "down" ? row.feedback : null,
    files: JSON.parse(row.files_json) as string[],
    role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
    uuid: row.uuid
  };
}

function compactTitle(message: string) {
  const title = message.replace(/\s+/gu, " ").trim();
  return title.length > 80 ? `${title.slice(0, 77)}…` : title;
}

export const orchestrationChatRepository = new OrchestrationChatRepository();
