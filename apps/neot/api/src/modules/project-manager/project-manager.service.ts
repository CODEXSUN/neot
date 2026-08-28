import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { ProjectManagerRepository } from "./project-manager.repository.js";
import {
  ProjectManagerAttachmentStorage,
  projectManagerAttachmentLimitPerRecord,
  validateProjectManagerAttachment
} from "./project-manager.storage.js";
import type {
  ProjectManagerAttachment,
  ProjectManagerAttachmentKind,
  ProjectManagerAttachmentSummary,
  ProjectManagerKind,
  ProjectManagerRecord,
  ProjectManagerRegistryGroup,
  ProjectManagerRegistryModule,
  ProjectManagerRegistryPlatform,
  ProjectManagerRegistryResult,
  ProjectManagerRegistrySavePayload,
  ProjectManagerRegistryUpdatePayload,
  ProjectManagerSavePayload,
  ProjectManagerUpdatePayload,
  ProjectManagerResult
} from "./project-manager.types.js";

const kinds: ProjectManagerKind[] = [
  "activity",
  "discussion",
  "issue",
  "kanban",
  "project",
  "release",
  "review",
  "task",
  "timeline",
  "todo"
];
const attachmentKinds: ProjectManagerAttachmentKind[] = [
  "activity",
  "issue",
  "project",
  "review",
  "task"
];

export class ProjectManagerService {
  constructor(
    private readonly repository = new ProjectManagerRepository(),
    private readonly attachmentStorage = new ProjectManagerAttachmentStorage()
  ) {}

  list(kind: ProjectManagerKind) {
    assertKind(kind);
    return this.repository.list(kind);
  }

  async create(kind: ProjectManagerKind, input: ProjectManagerSavePayload, actorEmail: string) {
    assertKind(kind);
    const record = normalizeRecord(kind, {
      ...input,
      id: newUuid(),
      ...(kind === "project" ? { status: "new" } : kind === "issue" ? { status: "open" } : {})
    });
    if (await this.repository.itemKeyExists(kind, record.key)) {
      throw AppError.conflict(`${kind} key already exists.`);
    }
    return this.repository.create(record, actorEmail);
  }

  async update(
    kind: ProjectManagerKind,
    id: string,
    input: ProjectManagerUpdatePayload,
    actorEmail: string
  ) {
    assertKind(kind);
    const current = await this.repository.find(kind, id);
    if (!current) throw AppError.notFound(`${kind} record was not found.`);
    const next = normalizeRecord(kind, {
      ...current,
      ...withoutUndefined(input),
      id,
      ...(kind === "project" ? { status: current.status } : {}),
      updatedAt: now()
    });
    if (await this.repository.itemKeyExists(kind, next.key, id)) {
      throw AppError.conflict(`${kind} key already exists.`);
    }
    const updated = await this.repository.update(next, actorEmail);
    if (kind === "review" && current.status !== "completed" && next.status === "completed") {
      await this.repository.completeReviewHierarchy(next, actorEmail);
    }
    return updated;
  }

  async deactivate(kind: ProjectManagerKind, id: string, actorEmail: string) {
    return this.setActive(kind, id, false, actorEmail);
  }

  async restore(kind: ProjectManagerKind, id: string, actorEmail: string) {
    return this.setActive(kind, id, true, actorEmail);
  }

  async delete(kind: ProjectManagerKind, id: string, actorEmail: string) {
    assertKind(kind);
    const current = await this.repository.find(kind, id);
    if (!current) throw AppError.notFound(`${kind} record was not found.`);
    if (await this.repository.hasItemDependents(current)) {
      throw AppError.conflict("This Project Manager record is referenced by another record.");
    }
    const attachments = isAttachmentKind(kind)
      ? await this.repository.listAttachments(kind, id)
      : [];
    const result = await this.repository.delete(current, actorEmail);
    await Promise.all(
      attachments.map((attachment) => this.attachmentStorage.remove(attachment.storageKey))
    );
    return result;
  }

  async listAttachments(kind: ProjectManagerAttachmentKind, id: string) {
    await this.requireAttachmentRecord(kind, id);
    const attachments = await this.repository.listAttachments(kind, id);
    return attachments.map(publicAttachment);
  }

  async uploadAttachment(
    kind: ProjectManagerAttachmentKind,
    id: string,
    input: { data: Buffer; mimeType: string; originalName: string },
    actorEmail: string
  ) {
    await this.requireAttachmentRecord(kind, id);
    const current = await this.repository.listAttachments(kind, id);
    if (current.length >= projectManagerAttachmentLimitPerRecord) {
      throw AppError.validation(
        `A record can contain up to ${projectManagerAttachmentLimitPerRecord} attachments.`
      );
    }
    const validated = validateProjectManagerAttachment(
      input.data,
      input.mimeType,
      input.originalName
    );
    const attachmentId = newUuid();
    const storageKey = `project-manager/${kind}/${id}/${attachmentId}.${validated.extension}`;
    await this.attachmentStorage.write(storageKey, input.data);
    try {
      const attachment = await this.repository.createAttachment(
        {
          checksum: validated.checksum,
          createdBy: actorEmail,
          id: attachmentId,
          mimeType: validated.mimeType,
          originalName: validated.originalName,
          recordId: id,
          recordKind: kind,
          sizeBytes: input.data.byteLength,
          storageKey
        },
        actorEmail
      );
      if (!attachment) throw AppError.internal("Attachment metadata could not be loaded.");
      return publicAttachment(attachment);
    } catch (error) {
      await this.attachmentStorage.remove(storageKey);
      throw error;
    }
  }

  async downloadAttachment(kind: ProjectManagerAttachmentKind, id: string, attachmentId: string) {
    await this.requireAttachmentRecord(kind, id);
    const attachment = await this.repository.findAttachment(kind, id, attachmentId);
    if (!attachment) throw AppError.notFound("Attachment was not found.");
    return {
      attachment,
      data: await this.attachmentStorage.read(attachment.storageKey)
    };
  }

  async deleteAttachment(
    kind: ProjectManagerAttachmentKind,
    id: string,
    attachmentId: string,
    actorEmail: string
  ) {
    await this.requireAttachmentRecord(kind, id);
    const attachment = await this.repository.findAttachment(kind, id, attachmentId);
    if (!attachment) throw AppError.notFound("Attachment was not found.");
    const result = await this.repository.deleteAttachment(attachment, actorEmail);
    await this.attachmentStorage.remove(attachment.storageKey);
    return result;
  }

  async result(): Promise<ProjectManagerResult> {
    const entries = await Promise.all(
      kinds.map(async (kind) => [kind, await this.list(kind)] as const)
    );
    const records = Object.fromEntries(entries) as Record<
      ProjectManagerKind,
      ProjectManagerRecord[]
    >;
    const all = Object.values(records).flat();
    return {
      generatedAt: now(),
      records,
      summary: {
        active: all.filter((record) => record.active).length,
        blocked: all.filter(
          (record) =>
            ["blocked", "critical", "needs-review"].includes(record.status) ||
            record.priority === "critical"
        ).length,
        completed: all.filter((record) =>
          ["completed", "done", "released", "approved"].includes(record.status)
        ).length,
        total: all.length
      }
    };
  }

  async registryResult(): Promise<ProjectManagerRegistryResult> {
    const [platforms, groups, modules] = await Promise.all([
      this.repository.listRegistryPlatforms(),
      this.repository.listRegistryGroups(),
      this.repository.listRegistryModules()
    ]);
    return {
      generatedAt: now(),
      platforms: platforms.map((platform) => ({
        ...platform,
        groups: groupTree(groups, modules, platform.id, "")
      })),
      summary: {
        activeGroups: groups.filter((group) => group.active).length,
        activeModules: modules.filter((module) => module.active).length,
        platforms: platforms.length,
        totalGroups: groups.length,
        totalModules: modules.length
      }
    };
  }

  listRegistryPlatforms() {
    return this.repository.listRegistryPlatforms();
  }

  async createRegistryPlatform(input: ProjectManagerRegistrySavePayload, actorEmail: string) {
    const record = normalizePlatform({ ...input, id: newUuid() });
    if (await this.repository.registryPlatformKeyExists(record.key)) {
      throw AppError.conflict("Platform key already exists.");
    }
    return this.repository.createRegistryPlatform(record, actorEmail);
  }

  async updateRegistryPlatform(
    id: string,
    input: ProjectManagerRegistryUpdatePayload,
    actorEmail: string
  ) {
    const current = await this.repository.findRegistryPlatform(id);
    if (!current) throw AppError.notFound("Platform registry record was not found.");
    const next = normalizePlatform({
      ...current,
      ...withoutUndefined(input),
      id,
      updatedAt: now()
    });
    if (await this.repository.registryPlatformKeyExists(next.key, id)) {
      throw AppError.conflict("Platform key already exists.");
    }
    return this.repository.updateRegistryPlatform(next, actorEmail);
  }

  listRegistryGroups() {
    return this.repository.listRegistryGroups();
  }

  async createRegistryGroup(input: ProjectManagerRegistrySavePayload, actorEmail: string) {
    const record = normalizeGroup({ ...input, id: newUuid() });
    await this.validateGroupParents(record);
    if (await this.repository.registryGroupKeyExists(record.key)) {
      throw AppError.conflict("Module group key already exists.");
    }
    return this.repository.createRegistryGroup(record, actorEmail);
  }

  async updateRegistryGroup(
    id: string,
    input: ProjectManagerRegistryUpdatePayload,
    actorEmail: string
  ) {
    const current = await this.repository.findRegistryGroup(id);
    if (!current) throw AppError.notFound("Module group registry record was not found.");
    const next = normalizeGroup({
      ...current,
      ...withoutUndefined(input),
      id,
      updatedAt: now()
    });
    await this.validateGroupParents(next);
    if (await this.repository.registryGroupKeyExists(next.key, id)) {
      throw AppError.conflict("Module group key already exists.");
    }
    return this.repository.updateRegistryGroup(next, actorEmail);
  }

  listRegistryModules() {
    return this.repository.listRegistryModules();
  }

  async createRegistryModule(input: ProjectManagerRegistrySavePayload, actorEmail: string) {
    const record = normalizeModule({ ...input, id: newUuid() });
    await this.validateModuleParents(record);
    if (await this.repository.registryModuleKeyExists(record.key)) {
      throw AppError.conflict("Module key already exists.");
    }
    return this.repository.createRegistryModule(record, actorEmail);
  }

  async updateRegistryModule(
    id: string,
    input: ProjectManagerRegistryUpdatePayload,
    actorEmail: string
  ) {
    const current = await this.repository.findRegistryModule(id);
    if (!current) throw AppError.notFound("Module registry record was not found.");
    const next = normalizeModule({
      ...current,
      ...withoutUndefined(input),
      id,
      updatedAt: now()
    });
    await this.validateModuleParents(next);
    if (await this.repository.registryModuleKeyExists(next.key, id)) {
      throw AppError.conflict("Module key already exists.");
    }
    return this.repository.updateRegistryModule(next, actorEmail);
  }

  async setRegistryActive(
    kind: "groups" | "modules" | "platforms",
    id: string,
    active: boolean,
    actorEmail: string
  ) {
    if (kind === "platforms") {
      return this.updateRegistryPlatform(id, { active }, actorEmail);
    }
    if (kind === "groups") return this.updateRegistryGroup(id, { active }, actorEmail);
    return this.updateRegistryModule(id, { active }, actorEmail);
  }

  private async setActive(
    kind: ProjectManagerKind,
    id: string,
    active: boolean,
    actorEmail: string
  ) {
    assertKind(kind);
    const current = await this.repository.find(kind, id);
    if (!current) throw AppError.notFound(`${kind} record was not found.`);
    const next = { ...current, active, updatedAt: now() };
    return this.repository.update(next, actorEmail, active ? "restored" : "deactivated");
  }

  private async requireAttachmentRecord(kind: ProjectManagerAttachmentKind, id: string) {
    assertAttachmentKind(kind);
    const record = await this.repository.find(kind, id);
    if (!record) throw AppError.notFound(`${kind} record was not found.`);
    return record;
  }

  private async validateGroupParents(record: ProjectManagerRegistryGroup) {
    const platform = await this.repository.findRegistryPlatform(record.platformId);
    if (!platform) throw AppError.validation("Selected Platform does not exist.");
    let parentId = record.parentGroupId;
    const visited = new Set<string>();
    while (parentId) {
      if (parentId === record.id || visited.has(parentId)) {
        throw AppError.validation("Module group parent selection would create a cycle.");
      }
      visited.add(parentId);
      const parent = await this.repository.findRegistryGroup(parentId);
      if (!parent || parent.platformId !== record.platformId) {
        throw AppError.validation("Selected parent group does not belong to this Platform.");
      }
      parentId = parent.parentGroupId;
    }
  }

  private async validateModuleParents(record: ProjectManagerRegistryModule) {
    const group = await this.repository.findRegistryGroup(record.groupId);
    if (!group) throw AppError.validation("Selected module group does not exist.");
    let parentId = record.parentModuleId;
    const visited = new Set<string>();
    while (parentId) {
      if (parentId === record.id || visited.has(parentId)) {
        throw AppError.validation("Module parent selection would create a cycle.");
      }
      visited.add(parentId);
      const parent = await this.repository.findRegistryModule(parentId);
      if (!parent || parent.groupId !== record.groupId) {
        throw AppError.validation("Selected parent module does not belong to this group.");
      }
      parentId = parent.parentModuleId;
    }
  }
}

function normalizeRecord(
  kind: ProjectManagerKind,
  input: OptionalRecordInput & ProjectManagerSavePayload
): ProjectManagerRecord {
  const timestamp = now();
  return {
    active: input.active ?? true,
    assignee: input.assignee ?? "",
    createdAt: input.createdAt ?? timestamp,
    description: input.description ?? "",
    dueDate: input.dueDate ?? "",
    id: required(input.id, "id"),
    key: required(input.key, "key"),
    kind,
    lane: input.lane ?? (kind === "kanban" ? "Backlog" : ""),
    logoText: input.logoText ?? "",
    colorKey: input.colorKey ?? "",
    repositoryName: input.repositoryName ?? "",
    repositoryUrl: input.repositoryUrl ?? "",
    moduleKey: input.moduleKey ?? "project-manager",
    priority: input.priority ?? "medium",
    referenceId: input.referenceId ?? "",
    referenceType: input.referenceType ?? "",
    sortOrder: Number(input.sortOrder ?? 0),
    startDate: input.startDate ?? "",
    status: input.status ?? defaultStatus(kind),
    title: required(input.title, "title"),
    type: input.type ?? kind,
    updatedAt: input.updatedAt ?? timestamp
  };
}

function normalizePlatform(
  input: OptionalPlatformInput & ProjectManagerRegistrySavePayload
): ProjectManagerRegistryPlatform {
  const timestamp = now();
  return {
    active: input.active ?? true,
    createdAt: input.createdAt ?? timestamp,
    description: input.description ?? "",
    id: required(input.id, "id"),
    key: required(input.key, "key"),
    name: required(input.name, "name"),
    sortOrder: Number(input.sortOrder ?? 0),
    status: input.status ?? "active",
    updatedAt: input.updatedAt ?? timestamp
  };
}

function normalizeGroup(
  input: OptionalGroupInput & ProjectManagerRegistrySavePayload
): ProjectManagerRegistryGroup {
  const timestamp = now();
  return {
    active: input.active ?? true,
    createdAt: input.createdAt ?? timestamp,
    description: input.description ?? "",
    id: required(input.id, "id"),
    key: required(input.key, "key"),
    name: required(input.name, "name"),
    parentGroupId: input.parentGroupId ?? "",
    platformId: required(input.platformId, "platformId"),
    sortOrder: Number(input.sortOrder ?? 0),
    status: input.status ?? "active",
    updatedAt: input.updatedAt ?? timestamp
  };
}

function normalizeModule(
  input: OptionalModuleInput & ProjectManagerRegistrySavePayload
): ProjectManagerRegistryModule {
  const timestamp = now();
  return {
    active: input.active ?? true,
    createdAt: input.createdAt ?? timestamp,
    description: input.description ?? "",
    documentation: input.documentation ?? {},
    groupId: required(input.groupId, "groupId"),
    id: required(input.id, "id"),
    key: required(input.key, "key"),
    moduleType: input.moduleType ?? "module",
    name: required(input.name, "name"),
    parentModuleId: input.parentModuleId ?? "",
    planningNotes: input.planningNotes ?? [],
    routePath: input.routePath ?? "",
    sortOrder: Number(input.sortOrder ?? 0),
    status: input.status ?? "active",
    updatedAt: input.updatedAt ?? timestamp
  };
}

function groupTree(
  groups: ProjectManagerRegistryGroup[],
  modules: ProjectManagerRegistryModule[],
  platformId: string,
  parentGroupId: string
): ProjectManagerRegistryResult["platforms"][number]["groups"] {
  return groups
    .filter((group) => group.platformId === platformId && group.parentGroupId === parentGroupId)
    .map((group) => ({
      ...group,
      modules: moduleTree(modules, group.id, ""),
      subGroups: groupTree(groups, modules, platformId, group.id)
    }));
}

function moduleTree(
  modules: ProjectManagerRegistryModule[],
  groupId: string,
  parentModuleId: string
): ProjectManagerRegistryResult["platforms"][number]["groups"][number]["modules"] {
  return modules
    .filter((module) => module.groupId === groupId && module.parentModuleId === parentModuleId)
    .map((module) => ({
      ...module,
      children: moduleTree(modules, groupId, module.id)
    }));
}

function assertKind(kind: string): asserts kind is ProjectManagerKind {
  if (!kinds.includes(kind as ProjectManagerKind)) {
    throw AppError.validation("Unsupported project manager kind.");
  }
}

function assertAttachmentKind(kind: string): asserts kind is ProjectManagerAttachmentKind {
  if (!isAttachmentKind(kind)) {
    throw AppError.validation(
      "Attachments are supported for projects, modules, tasks, actions, and reviews."
    );
  }
}

function isAttachmentKind(kind: string): kind is ProjectManagerAttachmentKind {
  return attachmentKinds.includes(kind as ProjectManagerAttachmentKind);
}

function publicAttachment(attachment: ProjectManagerAttachment): ProjectManagerAttachmentSummary {
  return {
    checksum: attachment.checksum,
    createdAt: attachment.createdAt,
    createdBy: attachment.createdBy,
    id: attachment.id,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    recordId: attachment.recordId,
    recordKind: attachment.recordKind,
    sizeBytes: attachment.sizeBytes
  };
}

function defaultStatus(kind: ProjectManagerKind) {
  if (kind === "project") return "new";
  if (kind === "issue" || kind === "discussion" || kind === "todo") return "open";
  if (kind === "review") return "requested";
  if (kind === "release") return "planned";
  return "active";
}

function required(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw AppError.validation(`${fieldName} is required.`);
  }
  return value.trim();
}

function withoutUndefined<T extends object>(
  input: T
): { [Key in keyof T]?: Exclude<T[Key], undefined> } {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as {
    [Key in keyof T]?: Exclude<T[Key], undefined>;
  };
}

function newUuid() {
  return randomBytes(4).toString("hex");
}

function now() {
  return new Date().toISOString();
}

type OptionalRecordInput = {
  [Key in keyof ProjectManagerRecord]?: ProjectManagerRecord[Key] | undefined;
};
type OptionalPlatformInput = {
  [Key in keyof ProjectManagerRegistryPlatform]?: ProjectManagerRegistryPlatform[Key] | undefined;
};
type OptionalGroupInput = {
  [Key in keyof ProjectManagerRegistryGroup]?: ProjectManagerRegistryGroup[Key] | undefined;
};
type OptionalModuleInput = {
  [Key in keyof ProjectManagerRegistryModule]?: ProjectManagerRegistryModule[Key] | undefined;
};
