import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import type { Selectable } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type { PlanningBoardsTable, PlanningCommentsTable } from "../../database/schema.js";
import type {
  PlanningBoard,
  PlanningComment,
  PlanningRecordKind,
  PlanningScene
} from "./planning.types.js";

const emptyScene: PlanningScene = { elements: [] };

export class PlanningRepository {
  private readonly database = getNEOTDatabase();

  async list(record?: { kind: PlanningRecordKind; uuid: string }) {
    let query = this.database
      .selectFrom("neot_planning_boards")
      .selectAll()
      .where("sync_status", "!=", "deleted");
    if (record)
      query = query.where("uuid", "in", (builder) =>
        builder
          .selectFrom("neot_planning_board_links")
          .select("board_uuid")
          .where("record_kind", "=", record.kind)
          .where("record_uuid", "=", record.uuid)
          .where("sync_status", "!=", "deleted")
      );
    return (await query.orderBy("updated_at", "desc").execute()).map(mapBoard);
  }

  async find(uuid: string) {
    const row = await this.database
      .selectFrom("neot_planning_boards")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Planning board was not found.");
    return mapBoard(row);
  }

  async create(
    input: {
      description: string;
      projectUuid: string | null;
      recordKind?: PlanningRecordKind | undefined;
      recordUuid?: string | undefined;
      title: string;
    },
    actor: string
  ) {
    const record =
      input.recordKind && input.recordUuid
        ? { kind: input.recordKind, uuid: input.recordUuid }
        : input.projectUuid
          ? { kind: "project" as const, uuid: input.projectUuid }
          : null;
    if (record) await this.requireRecord(record.kind, record.uuid);
    const uuid = randomBytes(4).toString("hex");
    await this.database
      .insertInto("neot_planning_boards")
      .values({
        created_by: actor,
        description: input.description,
        project_uuid: input.projectUuid,
        scene_json: JSON.stringify(emptyScene),
        status: "active",
        title: input.title,
        updated_by: actor,
        uuid
      })
      .executeTakeFirstOrThrow();
    if (record) await this.link(uuid, record.kind, record.uuid, actor);
    return this.find(uuid);
  }

  async link(boardUuid: string, kind: PlanningRecordKind, recordUuid: string, actor: string) {
    await this.find(boardUuid);
    await this.requireRecord(kind, recordUuid);
    await this.database
      .insertInto("neot_planning_board_links")
      .values({
        board_uuid: boardUuid,
        created_by: actor,
        record_kind: kind,
        record_uuid: recordUuid,
        uuid: randomBytes(4).toString("hex")
      })
      .onDuplicateKeyUpdate({ sync_status: "pending" })
      .executeTakeFirst();
    return this.find(boardUuid);
  }

  async comments(boardUuid: string) {
    await this.find(boardUuid);
    const rows = await this.database
      .selectFrom("neot_planning_comments")
      .selectAll()
      .where("board_uuid", "=", boardUuid)
      .where("sync_status", "!=", "deleted")
      .orderBy("created_at", "asc")
      .execute();
    const reactions = await this.database
      .selectFrom("neot_planning_reactions")
      .selectAll()
      .where("comment_uuid", "in", rows.length ? rows.map((row) => row.uuid) : [""])
      .where("sync_status", "!=", "deleted")
      .execute();
    return rows.map((row) =>
      mapComment(
        row,
        reactions
          .filter((reaction) => reaction.comment_uuid === row.uuid)
          .map((reaction) => ({
            createdBy: reaction.created_by,
            reaction: reaction.reaction,
            uuid: reaction.uuid
          }))
      )
    );
  }

  async createComment(
    boardUuid: string,
    input: { body: string; elementId?: string | undefined },
    actor: string
  ) {
    await this.find(boardUuid);
    const commentUuid = randomBytes(4).toString("hex");
    const mentions = [
      ...new Set(input.body.match(/@[A-Za-z0-9._%+-]+(?:@[A-Za-z0-9.-]+)?/gu) ?? [])
    ].map((mention) => mention.slice(1));
    await this.database
      .insertInto("neot_planning_comments")
      .values({
        board_uuid: boardUuid,
        body: input.body,
        created_by: actor,
        element_id: input.elementId ?? null,
        mentions_json: JSON.stringify(mentions),
        resolved_at: null,
        resolved_by: null,
        status: "open",
        updated_by: actor,
        uuid: commentUuid
      })
      .executeTakeFirstOrThrow();
    return (await this.comments(boardUuid)).find((comment) => comment.uuid === commentUuid);
  }

  async setCommentResolved(commentUuid: string, resolved: boolean, actor: string) {
    const row = await this.requireComment(commentUuid);
    await this.database
      .updateTable("neot_planning_comments")
      .set({
        resolved_at: resolved ? new Date() : null,
        resolved_by: resolved ? actor : null,
        status: resolved ? "resolved" : "open",
        sync_status: "pending",
        sync_updated_at: new Date(),
        sync_version: (eb) => eb("sync_version", "+", 1),
        updated_at: new Date(),
        updated_by: actor
      })
      .where("uuid", "=", commentUuid)
      .executeTakeFirst();
    return (await this.comments(row.board_uuid)).find((comment) => comment.uuid === commentUuid);
  }

  async toggleReaction(commentUuid: string, reaction: string, actor: string) {
    const comment = await this.requireComment(commentUuid);
    const existing = await this.database
      .selectFrom("neot_planning_reactions")
      .select(["uuid", "sync_status"])
      .where("comment_uuid", "=", commentUuid)
      .where("reaction", "=", reaction)
      .where("created_by", "=", actor)
      .executeTakeFirst();
    if (existing)
      await this.database
        .updateTable("neot_planning_reactions")
        .set({
          sync_status: existing.sync_status === "deleted" ? "pending" : "deleted",
          sync_updated_at: new Date(),
          sync_version: (eb) => eb("sync_version", "+", 1)
        })
        .where("uuid", "=", existing.uuid)
        .executeTakeFirst();
    else
      await this.database
        .insertInto("neot_planning_reactions")
        .values({
          comment_uuid: commentUuid,
          created_by: actor,
          reaction,
          uuid: randomBytes(4).toString("hex")
        })
        .executeTakeFirst();
    return (await this.comments(comment.board_uuid)).find((entry) => entry.uuid === commentUuid);
  }

  async update(
    uuid: string,
    input: {
      description?: string | undefined;
      projectUuid?: string | null | undefined;
      scene?: PlanningScene | undefined;
      title?: string | undefined;
    },
    actor: string
  ) {
    await this.find(uuid);
    if (input.projectUuid !== undefined)
      if (input.projectUuid) await this.requireRecord("project", input.projectUuid);
    await this.database
      .updateTable("neot_planning_boards")
      .set({
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.projectUuid === undefined ? {} : { project_uuid: input.projectUuid }),
        ...(input.scene === undefined
          ? {}
          : { scene_json: JSON.stringify(sanitizeScene(input.scene)) }),
        ...(input.title === undefined ? {} : { title: input.title }),
        sync_direction: "local",
        sync_status: "pending",
        sync_updated_at: new Date(),
        sync_version: (eb) => eb("sync_version", "+", 1),
        updated_at: new Date(),
        updated_by: actor
      })
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return this.find(uuid);
  }

  async delete(uuid: string, actor: string) {
    const board = await this.find(uuid);
    const commentUuids = await this.database
      .selectFrom("neot_planning_comments")
      .select("uuid")
      .where("board_uuid", "=", uuid)
      .execute();
    await this.database
      .updateTable("neot_planning_boards")
      .set({
        status: "archived",
        sync_direction: "local",
        sync_status: "deleted",
        sync_updated_at: new Date(),
        sync_version: (eb) => eb("sync_version", "+", 1),
        updated_at: new Date(),
        updated_by: actor
      })
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    await this.database
      .updateTable("neot_planning_board_links")
      .set({
        sync_status: "deleted",
        sync_updated_at: new Date(),
        sync_version: (eb) => eb("sync_version", "+", 1)
      })
      .where("board_uuid", "=", uuid)
      .execute();
    await this.database
      .updateTable("neot_planning_comments")
      .set({
        status: "resolved",
        sync_status: "deleted",
        sync_updated_at: new Date(),
        sync_version: (eb) => eb("sync_version", "+", 1),
        updated_at: new Date(),
        updated_by: actor
      })
      .where("board_uuid", "=", uuid)
      .execute();
    if (commentUuids.length)
      await this.database
        .updateTable("neot_planning_reactions")
        .set({
          sync_status: "deleted",
          sync_updated_at: new Date(),
          sync_version: (eb) => eb("sync_version", "+", 1)
        })
        .where(
          "comment_uuid",
          "in",
          commentUuids.map((comment) => comment.uuid)
        )
        .execute();
    return { deleted: true, uuid: board.uuid };
  }

  private async requireRecord(kind: PlanningRecordKind, recordUuid: string) {
    const record = await this.database
      .selectFrom("neot_project_manager_items")
      .select("uuid")
      .where("uuid", "=", recordUuid)
      .where("kind", "=", kind)
      .where("active", "=", 1)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    if (!record) throw AppError.validation(`Selected NEOT ${kind} was not found.`);
  }

  private async requireComment(uuid: string) {
    const row = await this.database
      .selectFrom("neot_planning_comments")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Planning comment was not found.");
    return row;
  }
}

function mapBoard(row: Selectable<PlanningBoardsTable>): PlanningBoard {
  return {
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by,
    description: row.description,
    projectUuid: row.project_uuid,
    scene: sanitizeScene(JSON.parse(row.scene_json)),
    status: row.status,
    title: row.title,
    updatedAt: new Date(row.updated_at).toISOString(),
    updatedBy: row.updated_by,
    uuid: row.uuid,
    syncVersion: row.sync_version
  };
}

function sanitizeScene(value: unknown): PlanningScene {
  const scene = isRecord(value) ? value : {};
  const appState = isRecord(scene.appState) ? { ...scene.appState } : {};
  delete appState.collaborators;
  return {
    appState,
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    files: isRecord(scene.files) ? scene.files : {}
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapComment(
  row: Selectable<PlanningCommentsTable>,
  reactions: PlanningComment["reactions"]
): PlanningComment {
  return {
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by,
    elementId: row.element_id,
    mentions: JSON.parse(row.mentions_json) as string[],
    reactions,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    resolvedBy: row.resolved_by,
    status: row.status === "resolved" ? "resolved" : "open",
    updatedAt: new Date(row.updated_at).toISOString(),
    uuid: row.uuid
  };
}
