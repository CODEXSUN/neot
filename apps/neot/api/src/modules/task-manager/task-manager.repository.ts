import { randomBytes } from "node:crypto";
import type { Kysely, Selectable } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type {
  NEOTDatabase,
  TaskManagerLookupsTable,
  TaskManagerTodosTable
} from "../../database/schema.js";
import type { Todo, TodoLookup, TodoLookupKind } from "./task-manager.types.js";

export class TaskManagerRepository {
  constructor(private readonly database: Kysely<NEOTDatabase> = getNEOTDatabase()) {}

  async list(scopeKey: string, ownerEmail: string) {
    const rows = await this.database
      .selectFrom("neot_task_manager_todos")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .where("owner_email", "=", ownerEmail)
      .where("sync_status", "!=", "deleted")
      .orderBy("position")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(mapTodo);
  }

  async find(scopeKey: string, uuid: string, ownerEmail: string) {
    const row = await this.database
      .selectFrom("neot_task_manager_todos")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .where("uuid", "=", uuid)
      .where("owner_email", "=", ownerEmail)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    return row ? mapTodo(row) : null;
  }

  async create(scopeKey: string, record: Todo, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("neot_task_manager_todos")
        .values(todoValues(scopeKey, record, actorEmail))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, actorEmail, "created", record.id, {
        title: record.title
      });
    });
    return record;
  }

  async update(scopeKey: string, record: Todo, actorEmail: string, action = "updated") {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_task_manager_todos")
        .set({
          category: record.category,
          description: record.description,
          due_date: record.dueDate,
          group_name: record.groupName,
          project_uuid: record.projectId,
          position: record.position,
          priority: record.priority,
          status: record.status,
          title: record.title,
          updated_at: new Date(record.updatedAt)
        })
        .where("scope_key", "=", scopeKey)
        .where("uuid", "=", record.id)
        .where("owner_email", "=", actorEmail)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, actorEmail, action, record.id, {
        status: record.status,
        title: record.title
      });
    });
    return record;
  }

  async delete(scopeKey: string, record: Todo, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_task_manager_todos")
        .set({
          sync_direction: "outbound",
          sync_status: "deleted",
          sync_updated_at: new Date()
        })
        .where("scope_key", "=", scopeKey)
        .where("uuid", "=", record.id)
        .where("owner_email", "=", actorEmail)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, actorEmail, "deleted", record.id, {
        title: record.title
      });
    });
    return { deleted: true, id: record.id };
  }

  async reorder(scopeKey: string, records: Todo[], actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      for (const record of records) {
        await transaction
          .updateTable("neot_task_manager_todos")
          .set({
            position: record.position,
            updated_at: new Date(record.updatedAt)
          })
          .where("scope_key", "=", scopeKey)
          .where("uuid", "=", record.id)
          .where("owner_email", "=", actorEmail)
          .executeTakeFirstOrThrow();
      }
      await writeActivity(transaction, actorEmail, "reordered", "multiple", {
        orderedIds: records.map((record) => record.id)
      });
    });
    return records;
  }

  async listLookups(scopeKey: string) {
    const rows = await this.database
      .selectFrom("neot_task_manager_lookups")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .where("sync_status", "!=", "deleted")
      .orderBy("kind")
      .orderBy("name")
      .execute();
    return rows.map(mapLookup);
  }

  async findLookupByName(scopeKey: string, kind: TodoLookupKind, name: string) {
    const row = await this.database
      .selectFrom("neot_task_manager_lookups")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .where("kind", "=", kind)
      .where("name", "=", name)
      .executeTakeFirst();
    return row ? mapLookup(row) : null;
  }

  async createLookup(scopeKey: string, record: TodoLookup, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("neot_task_manager_lookups")
        .values({
          created_at: new Date(record.createdAt),
          kind: record.kind,
          name: record.name,
          scope_key: scopeKey,
          uuid: record.id,
          value: record.value
        })
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, actorEmail, "lookup-created", record.id, {
        kind: record.kind,
        name: record.name
      });
    });
    return record;
  }
}

function todoValues(scopeKey: string, record: Todo, ownerEmail: string) {
  return {
    category: record.category,
    created_at: new Date(record.createdAt),
    description: record.description,
    due_date: record.dueDate,
    group_name: record.groupName,
    owner_email: ownerEmail,
    project_uuid: record.projectId,
    position: record.position,
    priority: record.priority,
    scope_key: scopeKey,
    status: record.status,
    title: record.title,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

async function writeActivity(
  database: Kysely<NEOTDatabase>,
  actorEmail: string,
  action: string,
  recordUuid: string,
  details: unknown
) {
  await database
    .insertInto("neot_task_manager_activity")
    .values({
      action,
      actor_email: actorEmail,
      details_json: JSON.stringify(details),
      record_uuid: recordUuid,
      uuid: newUuid()
    })
    .executeTakeFirstOrThrow();
}

function mapTodo(row: Selectable<TaskManagerTodosTable>): Todo {
  return {
    category: row.category,
    createdAt: iso(row.created_at),
    description: row.description,
    dueDate: row.due_date,
    groupName: row.group_name,
    projectId: row.project_uuid,
    id: row.uuid,
    position: row.position,
    priority: row.priority,
    status: row.status,
    title: row.title,
    updatedAt: iso(row.updated_at)
  };
}

function mapLookup(row: Selectable<TaskManagerLookupsTable>): TodoLookup {
  return {
    createdAt: iso(row.created_at),
    id: row.uuid,
    kind: row.kind as TodoLookupKind,
    name: row.name,
    value: row.value
  };
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function newUuid() {
  return randomBytes(4).toString("hex");
}
