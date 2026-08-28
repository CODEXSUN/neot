import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { TaskManagerRepository } from "./task-manager.repository.js";
import type {
  Todo,
  TodoInput,
  TodoLookup,
  TodoLookupKind,
  TodoStatus,
  TodoUpdateInput
} from "./task-manager.types.js";

const lookupKinds: TodoLookupKind[] = ["category", "group", "priority", "status"];

export class TaskManagerService {
  constructor(private readonly repository = new TaskManagerRepository()) {}

  list(scopeKey: string, actorEmail: string) {
    return this.repository.list(scopeKey, actorEmail);
  }

  async create(scopeKey: string, input: TodoInput, actorEmail: string) {
    const title = requiredTitle(input.title);
    const records = await this.repository.list(scopeKey, actorEmail);
    const timestamp = now();
    const record: Todo = {
      category: input.category ?? "work",
      createdAt: timestamp,
      description: String(input.description ?? ""),
      dueDate: String(input.dueDate ?? ""),
      groupName: String(input.groupName ?? "").trim(),
      projectId: String(input.projectId ?? "").trim(),
      id: newUuid(),
      position: records.length,
      priority: input.priority ?? "medium",
      status: input.status ?? "open",
      title,
      updatedAt: timestamp
    };
    return this.repository.create(scopeKey, record, actorEmail);
  }

  async update(scopeKey: string, id: string, input: TodoUpdateInput, actorEmail: string) {
    const current = await this.repository.find(scopeKey, id, actorEmail);
    if (!current) throw AppError.notFound("Todo was not found.");
    const next: Todo = {
      ...current,
      category: input.category ?? current.category,
      description: String(input.description ?? current.description),
      dueDate: String(input.dueDate ?? current.dueDate),
      groupName: String(input.groupName ?? current.groupName).trim(),
      projectId: String(input.projectId ?? current.projectId).trim(),
      priority: input.priority ?? current.priority,
      status: input.status ?? current.status,
      title: requiredTitle(input.title ?? current.title),
      updatedAt: now()
    };
    return this.repository.update(scopeKey, next, actorEmail);
  }

  async status(scopeKey: string, id: string, status: TodoStatus, actorEmail: string) {
    const current = await this.repository.find(scopeKey, id, actorEmail);
    if (!current) throw AppError.notFound("Todo was not found.");
    return this.repository.update(
      scopeKey,
      { ...current, status, updatedAt: now() },
      actorEmail,
      "status-changed"
    );
  }

  async delete(scopeKey: string, id: string, actorEmail: string) {
    const current = await this.repository.find(scopeKey, id, actorEmail);
    if (!current) throw AppError.notFound("Todo was not found.");
    return this.repository.delete(scopeKey, current, actorEmail);
  }

  async reorder(scopeKey: string, orderedIds: string[], actorEmail: string) {
    const records = await this.repository.list(scopeKey, actorEmail);
    const known = new Set(records.map((record) => record.id));
    const ordered = orderedIds.filter((id) => known.has(id));
    const remaining = records.map((record) => record.id).filter((id) => !ordered.includes(id));
    const sequence = [...ordered, ...remaining];
    const timestamp = now();
    const updated = records.map((record) => ({
      ...record,
      position: sequence.indexOf(record.id),
      updatedAt: ordered.includes(record.id) ? timestamp : record.updatedAt
    }));
    return this.repository.reorder(scopeKey, updated, actorEmail);
  }

  listLookups(scopeKey: string) {
    return this.repository.listLookups(scopeKey);
  }

  async createLookup(
    scopeKey: string,
    kind: TodoLookupKind,
    nameInput: string,
    actorEmail: string
  ) {
    if (!lookupKinds.includes(kind)) throw AppError.validation("Lookup type is invalid.");
    const name = nameInput.trim();
    if (!name) throw AppError.validation("Lookup name is required.");
    const duplicate = await this.repository.findLookupByName(scopeKey, kind, name);
    if (duplicate) return duplicate;
    const record: TodoLookup = {
      createdAt: now(),
      id: newUuid(),
      kind,
      name,
      value: toValue(name)
    };
    return this.repository.createLookup(scopeKey, record, actorEmail);
  }
}

function requiredTitle(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw AppError.validation("Todo title is required.");
  }
  return value.trim();
}

function toValue(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || newUuid()
  );
}

function newUuid() {
  return randomBytes(4).toString("hex");
}

function now() {
  return new Date().toISOString();
}
