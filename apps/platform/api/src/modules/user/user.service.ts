import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { hashPassword } from "../../auth/password-hash.js";
import { recordAuditEvent } from "../../database/audit.js";
import { userRoleStandardAccessContract } from "../user-role/index.js";
import { UserRepository } from "./user.repository.js";
import type {
  User,
  UserContext,
  UserListFilters,
  UserProfile,
  UserProfileSavePayload,
  UserSavePayload,
  UserStatus
} from "./user.types.js";
import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export class UserService {
  private readonly repository: UserRepository;
  constructor(private readonly context: UserContext) {
    this.repository = new UserRepository(context.database);
  }
  async list(filters: UserListFilters = {}) {
    await this.context.authorize("identity.user.view");
    return this.repository.list(filters);
  }
  async get(id: string) {
    await this.context.authorize("identity.user.view");
    return this.repository.find(id);
  }
  async getProfile(): Promise<UserProfile> {
    const record = await this.repository.findByEmail(this.context.actorEmail);
    if (!record) throw AppError.notFound("Signed-in user was not found.");
    return profile(record);
  }
  async updateProfile(input: UserProfileSavePayload): Promise<UserProfile> {
    const current = await this.repository.findByEmail(this.context.actorEmail);
    if (!current) throw AppError.notFound("Signed-in user was not found.");
    const value = normalizeProfile(input);
    const record = (await this.save(() =>
      this.repository.updateProfile(
        current.id,
        value,
        value.password ? hashPassword(value.password) : undefined
      )
    ))!;
    await this.audit("profile-updated", record);
    return profile(record);
  }
  async create(input: UserSavePayload) {
    await this.context.authorize("identity.user.create");
    const value = normalize(input, true);
    let record = await this.save(() =>
      this.repository.create(value, randomBytes(4).toString("hex"), hashPassword(value.password!))
    );
    const access = userRoleStandardAccessContract({
      actorEmail: this.context.actorEmail,
      database: this.context.database
    });
    await access.ensureForUser(record.id);
    if (value.roleId) await access.setPrimaryRole(record.id, value.roleId);
    record = (await this.repository.find(record.id))!;
    await this.audit("created", record);
    return record;
  }
  async update(id: string, input: UserSavePayload) {
    await this.context.authorize("identity.user.update");
    const current = await this.required(id);
    const value = normalize(input, false);
    if (current.isProtected) {
      if (this.context.actorEmail.toLowerCase() !== current.email.toLowerCase()) {
        throw AppError.forbidden("The protected system user can only edit its own account.");
      }
      if (value.name !== current.name || value.status !== current.status) {
        throw AppError.forbidden("The protected system user's name and status cannot be modified.");
      }
      if (value.roleId) {
        throw AppError.forbidden("The protected system user's role cannot be modified.");
      }
    }
    let record = (await this.save(() =>
      this.repository.update(
        current.id,
        value,
        value.password ? hashPassword(value.password) : undefined
      )
    ))!;
    if (value.roleId) {
      await userRoleStandardAccessContract({
        actorEmail: this.context.actorEmail,
        database: this.context.database
      }).setPrimaryRole(record.id, value.roleId);
      record = (await this.repository.find(record.id))!;
    }
    await this.audit("updated", record);
    return record;
  }
  async setStatus(id: string, status: UserStatus) {
    await this.context.authorize("identity.user.suspend");
    const current = await this.mutable(id);
    const record = (await this.repository.setStatus(current.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", record);
    return record;
  }
  async forceDelete(id: string) {
    await this.context.authorize("identity.user.delete");
    const current = await this.mutable(id);
    const count = await this.repository.dependentCount(current.id);
    if (count)
      throw AppError.conflict(
        `User cannot be force deleted because ${count} role assignments reference it.`,
        { count }
      );
    const record = await this.delete(current.id);
    await this.audit("force-deleted", record);
    return record;
  }
  private async mutable(id: string): Promise<User> {
    const record = await this.required(id);
    if (record.isProtected) throw AppError.forbidden("Protected users cannot be modified.");
    return record;
  }
  private async required(id: string): Promise<User> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("User was not found.");
    return record;
  }
  private async audit(action: string, record: User) {
    await recordAuditEvent({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "identity.user",
      recordId: record.id,
      recordLabel: record.name,
      recordUuid: record.uuid
    });
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("User email already exists.");
      throw error;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (error) {
      if (isReferenced(error)) {
        throw AppError.conflict(
          "User cannot be force deleted because business or audit records reference it."
        );
      }
      throw error;
    }
  }
}

/** Fixed public lookup contract for modules that reference active users. */
export function userReferenceContract(database: Kysely<PlatformDatabase>) {
  const repository = new UserRepository(database);
  return {
    find: (id: number) => repository.findActiveReference(id),
    list: () => repository.listActiveReferences()
  };
}

function normalize(input: UserSavePayload, creating: boolean): UserSavePayload {
  const password = input.password?.trim();
  if (creating && (!password || password.length < 8))
    throw AppError.validation("Password must contain at least 8 characters.");
  return {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    ...(password ? { password } : {}),
    ...(input.roleId ? { roleId: input.roleId } : {}),
    status: input.status
  };
}
function normalizeProfile(input: UserProfileSavePayload): UserProfileSavePayload {
  const password = input.password?.trim();
  if (password && password.length < 8)
    throw AppError.validation("Password must contain at least 8 characters.");
  return {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    ...(password ? { password } : {})
  };
}
function profile(record: User): UserProfile {
  return {
    email: record.email,
    id: record.id,
    name: record.name,
    uuid: record.uuid
  };
}
function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}

function isReferenced(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (("code" in error && (error as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2") ||
      ("errno" in error && (error as { errno?: unknown }).errno === 1451))
  );
}
