import { randomBytes } from "node:crypto";
import type { Kysely, Selectable } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type {
  NEOTDatabase,
  ProjectManagerAttachmentsTable,
  ProjectManagerItemsTable,
  ProjectManagerRegistryGroupsTable,
  ProjectManagerRegistryModulesTable,
  ProjectManagerRegistryPlatformsTable
} from "../../database/schema.js";
import type {
  ProjectManagerAttachment,
  ProjectManagerAttachmentCreate,
  ProjectManagerAttachmentKind,
  ProjectManagerKind,
  ProjectManagerRecord,
  ProjectManagerRegistryGroup,
  ProjectManagerRegistryModule,
  ProjectManagerRegistryPlatform
} from "./project-manager.types.js";

type AuditInput = {
  action: string;
  actorEmail: string;
  details?: unknown;
  recordKind: string;
  recordUuid: string;
};

export class ProjectManagerRepository {
  constructor(private readonly database: Kysely<NEOTDatabase> = getNEOTDatabase()) {}

  async list(kind: ProjectManagerKind) {
    const rows = await this.database
      .selectFrom("neot_project_manager_items")
      .selectAll()
      .where("kind", "=", kind)
      .where("sync_status", "!=", "deleted")
      .orderBy("created_at", "asc")
      .orderBy("id", "asc")
      .execute();
    return rows.map(mapItem);
  }

  async find(kind: ProjectManagerKind, uuid: string) {
    const row = await this.database
      .selectFrom("neot_project_manager_items")
      .selectAll()
      .where("kind", "=", kind)
      .where("uuid", "=", uuid)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    return row ? mapItem(row) : null;
  }

  async itemKeyExists(kind: ProjectManagerKind, key: string, exceptUuid?: string) {
    let query = this.database
      .selectFrom("neot_project_manager_items")
      .select("id")
      .where("kind", "=", kind)
      .where("item_key", "=", key);
    if (exceptUuid) query = query.where("uuid", "!=", exceptUuid);
    return Boolean(await query.executeTakeFirst());
  }

  async hasItemDependents(record: ProjectManagerRecord) {
    const dependent = await this.database
      .selectFrom("neot_project_manager_items")
      .select("id")
      .where((expression) =>
        expression.or([
          expression("reference_id", "=", record.id),
          expression("reference_id", "=", record.key)
        ])
      )
      .executeTakeFirst();
    return Boolean(dependent);
  }

  async create(record: ProjectManagerRecord, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("neot_project_manager_items")
        .values(itemValues(record))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "created",
        actorEmail,
        details: { key: record.key, title: record.title },
        recordKind: record.kind,
        recordUuid: record.id
      });
    });
    return record;
  }

  async update(record: ProjectManagerRecord, actorEmail: string, action = "updated") {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_project_manager_items")
        .set({
          active: record.active ? 1 : 0,
          assignee: record.assignee,
          description: record.description,
          due_date: record.dueDate,
          item_key: record.key,
          item_type: record.type,
          lane: record.lane,
          logo_text: record.logoText,
          color_key: record.colorKey,
          repository_name: record.repositoryName,
          repository_url: record.repositoryUrl,
          module_key: record.moduleKey,
          priority: record.priority,
          reference_id: record.referenceId,
          reference_type: record.referenceType,
          sort_order: record.sortOrder,
          start_date: record.startDate,
          status: record.status,
          title: record.title,
          updated_at: new Date(record.updatedAt)
        })
        .where("kind", "=", record.kind)
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action,
        actorEmail,
        details: {
          active: record.active,
          key: record.key,
          status: record.status
        },
        recordKind: record.kind,
        recordUuid: record.id
      });
    });
    return record;
  }

  async completeReviewHierarchy(review: ProjectManagerRecord, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      const visited = new Set<string>();
      let child = review;
      while (child.referenceId) {
        const parentKind = hierarchyKind(child.referenceType);
        if (!parentKind) return;
        const parentRow = await transaction
          .selectFrom("neot_project_manager_items")
          .selectAll()
          .where("kind", "=", parentKind)
          .where((expression) =>
            expression.or([
              expression("uuid", "=", child.referenceId),
              expression("item_key", "=", child.referenceId)
            ])
          )
          .where("sync_status", "!=", "deleted")
          .executeTakeFirst();
        if (!parentRow || visited.has(parentRow.uuid)) return;
        visited.add(parentRow.uuid);
        const parent = mapItem(parentRow);
        if (parent.status !== "completed") {
          await transaction
            .updateTable("neot_project_manager_items")
            .set({ status: "completed", updated_at: new Date() })
            .where("uuid", "=", parent.id)
            .executeTakeFirstOrThrow();
          await writeActivity(transaction, {
            action: "completed-from-review",
            actorEmail,
            details: { reviewId: review.id, reviewKey: review.key },
            recordKind: parent.kind,
            recordUuid: parent.id
          });
        }
        if (parentKind === "issue") return;
        child = parent;
      }
    });
  }

  async delete(record: ProjectManagerRecord, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_project_manager_items")
        .set({
          active: 0,
          sync_direction: "outbound",
          sync_status: "deleted",
          sync_updated_at: new Date()
        })
        .where("kind", "=", record.kind)
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "deleted",
        actorEmail,
        details: { key: record.key, title: record.title },
        recordKind: record.kind,
        recordUuid: record.id
      });
    });
    return { deleted: true, id: record.id, title: record.title };
  }

  async listAttachments(recordKind: ProjectManagerAttachmentKind, recordUuid: string) {
    const rows = await this.database
      .selectFrom("neot_project_manager_attachments")
      .selectAll()
      .where("record_kind", "=", recordKind)
      .where("record_uuid", "=", recordUuid)
      .where("sync_status", "!=", "deleted")
      .orderBy("created_at", "asc")
      .orderBy("id", "asc")
      .execute();
    return rows.map(mapAttachment);
  }

  async findAttachment(
    recordKind: ProjectManagerAttachmentKind,
    recordUuid: string,
    attachmentUuid: string
  ) {
    const row = await this.database
      .selectFrom("neot_project_manager_attachments")
      .selectAll()
      .where("record_kind", "=", recordKind)
      .where("record_uuid", "=", recordUuid)
      .where("uuid", "=", attachmentUuid)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    return row ? mapAttachment(row) : null;
  }

  async createAttachment(input: ProjectManagerAttachmentCreate, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("neot_project_manager_attachments")
        .values({
          checksum: input.checksum,
          created_by: input.createdBy,
          mime_type: input.mimeType,
          original_name: input.originalName,
          record_kind: input.recordKind,
          record_uuid: input.recordId,
          size_bytes: input.sizeBytes,
          storage_key: input.storageKey,
          uuid: input.id
        })
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "attachment-created",
        actorEmail,
        details: {
          attachmentId: input.id,
          fileName: input.originalName,
          sizeBytes: input.sizeBytes
        },
        recordKind: input.recordKind,
        recordUuid: input.recordId
      });
    });
    return this.findAttachment(input.recordKind, input.recordId, input.id);
  }

  async deleteAttachment(attachment: ProjectManagerAttachment, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_project_manager_attachments")
        .set({
          sync_direction: "outbound",
          sync_status: "deleted",
          sync_updated_at: new Date()
        })
        .where("uuid", "=", attachment.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "attachment-deleted",
        actorEmail,
        details: {
          attachmentId: attachment.id,
          fileName: attachment.originalName
        },
        recordKind: attachment.recordKind,
        recordUuid: attachment.recordId
      });
    });
    return { deleted: true, id: attachment.id };
  }

  async listRegistryPlatforms() {
    const rows = await this.database
      .selectFrom("neot_project_manager_registry_platforms")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(mapPlatform);
  }

  async findRegistryPlatform(uuid: string) {
    const row = await this.database
      .selectFrom("neot_project_manager_registry_platforms")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? mapPlatform(row) : null;
  }

  async registryPlatformKeyExists(key: string, exceptUuid?: string) {
    let query = this.database
      .selectFrom("neot_project_manager_registry_platforms")
      .select("id")
      .where("platform_key", "=", key);
    if (exceptUuid) query = query.where("uuid", "!=", exceptUuid);
    return Boolean(await query.executeTakeFirst());
  }

  async createRegistryPlatform(record: ProjectManagerRegistryPlatform, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("neot_project_manager_registry_platforms")
        .values(platformValues(record))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-platform-created",
        actorEmail,
        details: { key: record.key, name: record.name },
        recordKind: "registry-platform",
        recordUuid: record.id
      });
    });
    return record;
  }

  async updateRegistryPlatform(record: ProjectManagerRegistryPlatform, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_project_manager_registry_platforms")
        .set({
          active: record.active ? 1 : 0,
          description: record.description,
          name: record.name,
          platform_key: record.key,
          sort_order: record.sortOrder,
          status: record.status,
          updated_at: new Date(record.updatedAt)
        })
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-platform-updated",
        actorEmail,
        details: { active: record.active, key: record.key },
        recordKind: "registry-platform",
        recordUuid: record.id
      });
    });
    return record;
  }

  async listRegistryGroups() {
    const rows = await this.database
      .selectFrom("neot_project_manager_registry_groups")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(mapGroup);
  }

  async findRegistryGroup(uuid: string) {
    const row = await this.database
      .selectFrom("neot_project_manager_registry_groups")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? mapGroup(row) : null;
  }

  async registryGroupKeyExists(key: string, exceptUuid?: string) {
    let query = this.database
      .selectFrom("neot_project_manager_registry_groups")
      .select("id")
      .where("group_key", "=", key);
    if (exceptUuid) query = query.where("uuid", "!=", exceptUuid);
    return Boolean(await query.executeTakeFirst());
  }

  async createRegistryGroup(record: ProjectManagerRegistryGroup, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("neot_project_manager_registry_groups")
        .values(groupValues(record))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-group-created",
        actorEmail,
        details: { key: record.key, name: record.name },
        recordKind: "registry-group",
        recordUuid: record.id
      });
    });
    return record;
  }

  async updateRegistryGroup(record: ProjectManagerRegistryGroup, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_project_manager_registry_groups")
        .set({
          active: record.active ? 1 : 0,
          description: record.description,
          group_key: record.key,
          name: record.name,
          parent_group_uuid: record.parentGroupId || null,
          platform_uuid: record.platformId,
          sort_order: record.sortOrder,
          status: record.status,
          updated_at: new Date(record.updatedAt)
        })
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-group-updated",
        actorEmail,
        details: { active: record.active, key: record.key },
        recordKind: "registry-group",
        recordUuid: record.id
      });
    });
    return record;
  }

  async listRegistryModules() {
    const rows = await this.database
      .selectFrom("neot_project_manager_registry_modules")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(mapModule);
  }

  async findRegistryModule(uuid: string) {
    const row = await this.database
      .selectFrom("neot_project_manager_registry_modules")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? mapModule(row) : null;
  }

  async registryModuleKeyExists(key: string, exceptUuid?: string) {
    let query = this.database
      .selectFrom("neot_project_manager_registry_modules")
      .select("id")
      .where("module_key", "=", key);
    if (exceptUuid) query = query.where("uuid", "!=", exceptUuid);
    return Boolean(await query.executeTakeFirst());
  }

  async createRegistryModule(record: ProjectManagerRegistryModule, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("neot_project_manager_registry_modules")
        .values(moduleValues(record))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-module-created",
        actorEmail,
        details: { key: record.key, name: record.name },
        recordKind: "registry-module",
        recordUuid: record.id
      });
    });
    return record;
  }

  async updateRegistryModule(record: ProjectManagerRegistryModule, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("neot_project_manager_registry_modules")
        .set({
          active: record.active ? 1 : 0,
          description: record.description,
          documentation_json: JSON.stringify(record.documentation),
          group_uuid: record.groupId,
          module_key: record.key,
          module_type: record.moduleType,
          name: record.name,
          parent_module_uuid: record.parentModuleId || null,
          planning_notes_json: JSON.stringify(record.planningNotes),
          route_path: record.routePath,
          sort_order: record.sortOrder,
          status: record.status,
          updated_at: new Date(record.updatedAt)
        })
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-module-updated",
        actorEmail,
        details: { active: record.active, key: record.key },
        recordKind: "registry-module",
        recordUuid: record.id
      });
    });
    return record;
  }
}

function itemValues(record: ProjectManagerRecord) {
  return {
    active: record.active ? 1 : 0,
    assignee: record.assignee,
    created_at: new Date(record.createdAt),
    description: record.description,
    due_date: record.dueDate,
    item_key: record.key,
    item_type: record.type,
    kind: record.kind,
    lane: record.lane,
    logo_text: record.logoText,
    color_key: record.colorKey,
    repository_name: record.repositoryName,
    repository_url: record.repositoryUrl,
    module_key: record.moduleKey,
    priority: record.priority,
    reference_id: record.referenceId,
    reference_type: record.referenceType,
    sort_order: record.sortOrder,
    start_date: record.startDate,
    status: record.status,
    title: record.title,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

function hierarchyKind(referenceType: string): "activity" | "issue" | "task" | null {
  const normalized = referenceType.trim().toLowerCase();
  if (normalized === "action" || normalized === "activity") return "activity";
  if (normalized === "task") return "task";
  if (["initiative", "issue", "module"].includes(normalized)) return "issue";
  return null;
}

function platformValues(record: ProjectManagerRegistryPlatform) {
  return {
    active: record.active ? 1 : 0,
    created_at: new Date(record.createdAt),
    description: record.description,
    name: record.name,
    platform_key: record.key,
    sort_order: record.sortOrder,
    status: record.status,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

function groupValues(record: ProjectManagerRegistryGroup) {
  return {
    active: record.active ? 1 : 0,
    created_at: new Date(record.createdAt),
    description: record.description,
    group_key: record.key,
    name: record.name,
    parent_group_uuid: record.parentGroupId || null,
    platform_uuid: record.platformId,
    sort_order: record.sortOrder,
    status: record.status,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

function moduleValues(record: ProjectManagerRegistryModule) {
  return {
    active: record.active ? 1 : 0,
    created_at: new Date(record.createdAt),
    description: record.description,
    documentation_json: JSON.stringify(record.documentation),
    group_uuid: record.groupId,
    module_key: record.key,
    module_type: record.moduleType,
    name: record.name,
    parent_module_uuid: record.parentModuleId || null,
    planning_notes_json: JSON.stringify(record.planningNotes),
    route_path: record.routePath,
    sort_order: record.sortOrder,
    status: record.status,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

async function writeActivity(database: Kysely<NEOTDatabase>, input: AuditInput) {
  await database
    .insertInto("neot_project_manager_activity")
    .values({
      action: input.action,
      actor_email: input.actorEmail,
      details_json: JSON.stringify(input.details ?? {}),
      record_kind: input.recordKind,
      record_uuid: input.recordUuid,
      uuid: newUuid()
    })
    .executeTakeFirstOrThrow();
}

function mapItem(row: Selectable<ProjectManagerItemsTable>): ProjectManagerRecord {
  return {
    active: Boolean(row.active),
    assignee: row.assignee,
    createdAt: iso(row.created_at),
    description: row.description,
    dueDate: row.due_date,
    id: row.uuid,
    key: row.item_key,
    kind: row.kind as ProjectManagerKind,
    lane: row.lane,
    logoText: row.logo_text,
    colorKey: row.color_key,
    repositoryName: row.repository_name,
    repositoryUrl: row.repository_url,
    moduleKey: row.module_key,
    priority: row.priority as ProjectManagerRecord["priority"],
    referenceId: row.reference_id,
    referenceType: row.reference_type,
    sortOrder: row.sort_order,
    startDate: row.start_date,
    status: row.status,
    title: row.title,
    type: row.item_type,
    updatedAt: iso(row.updated_at)
  };
}

function mapAttachment(row: Selectable<ProjectManagerAttachmentsTable>): ProjectManagerAttachment {
  return {
    checksum: row.checksum,
    createdAt: iso(row.created_at),
    createdBy: row.created_by,
    id: row.uuid,
    mimeType: row.mime_type,
    originalName: row.original_name,
    recordId: row.record_uuid,
    recordKind: row.record_kind as ProjectManagerAttachmentKind,
    sizeBytes: row.size_bytes,
    storageKey: row.storage_key
  };
}

function mapPlatform(
  row: Selectable<ProjectManagerRegistryPlatformsTable>
): ProjectManagerRegistryPlatform {
  return {
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    description: row.description,
    id: row.uuid,
    key: row.platform_key,
    name: row.name,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: iso(row.updated_at)
  };
}

function mapGroup(row: Selectable<ProjectManagerRegistryGroupsTable>): ProjectManagerRegistryGroup {
  return {
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    description: row.description,
    id: row.uuid,
    key: row.group_key,
    name: row.name,
    parentGroupId: row.parent_group_uuid ?? "",
    platformId: row.platform_uuid,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: iso(row.updated_at)
  };
}

function mapModule(
  row: Selectable<ProjectManagerRegistryModulesTable>
): ProjectManagerRegistryModule {
  return {
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    description: row.description,
    documentation: parseJson(row.documentation_json, {}),
    groupId: row.group_uuid,
    id: row.uuid,
    key: row.module_key,
    moduleType: row.module_type as ProjectManagerRegistryModule["moduleType"],
    name: row.name,
    parentModuleId: row.parent_module_uuid ?? "",
    planningNotes: parseJson(row.planning_notes_json, []),
    routePath: row.route_path,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: iso(row.updated_at)
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function newUuid() {
  return randomBytes(4).toString("hex");
}
