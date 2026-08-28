import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { recordAuditEvent } from "../../database/audit.js";
import { RoleRepository } from "./role.repository.js";
import type {
  Role,
  RoleContext,
  RoleListFilters,
  RoleSavePayload,
  RoleStatus
} from "./role.types.js";
export class RoleService {
  private repository;
  constructor(private context: RoleContext) {
    this.repository = new RoleRepository(context.database);
  }
  async list(f: RoleListFilters = {}) {
    await this.context.authorize("identity.role.view");
    return this.repository.list(f);
  }
  async get(id: string) {
    await this.context.authorize("identity.role.view");
    return this.repository.find(id);
  }
  async create(input: RoleSavePayload) {
    await this.context.authorize("identity.role.create");
    const r = await this.save(() =>
      this.repository.create(normalize(input), randomBytes(4).toString("hex"))
    );
    await this.audit("created", r);
    return r;
  }
  async update(id: string, input: RoleSavePayload) {
    await this.context.authorize("identity.role.update");
    const c = await this.mutable(id);
    const r = (await this.save(() => this.repository.update(c.id, normalize(input))))!;
    await this.audit("updated", r);
    return r;
  }
  async setStatus(id: string, status: RoleStatus) {
    await this.context.authorize("identity.role.suspend");
    const c = await this.mutable(id);
    const r = (await this.repository.setStatus(c.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", r);
    return r;
  }
  async forceDelete(id: string) {
    await this.context.authorize("identity.role.delete");
    const c = await this.mutable(id);
    const counts = await this.repository.dependentCounts(c.id);
    if (counts.userRoles || counts.rolePermissions)
      throw AppError.conflict(
        `Role cannot be force deleted because ${counts.userRoles} user-role and ${counts.rolePermissions} role-permission assignments reference it.`,
        counts
      );
    const r = await this.delete(c.id);
    await this.audit("force-deleted", r);
    return r;
  }
  private async mutable(id: string): Promise<Role> {
    const r = await this.repository.find(id);
    if (!r) throw AppError.notFound("Role was not found.");
    if (r.isProtected) throw AppError.forbidden("Protected roles cannot be modified.");
    return r;
  }
  private audit(action: string, r: Role) {
    return recordAuditEvent({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "identity.role",
      recordId: r.id,
      recordLabel: r.label,
      recordUuid: r.uuid
    });
  }
  private async save<T>(fn: () => Promise<T>) {
    try {
      return await fn();
    } catch (e) {
      if (
        typeof e === "object" &&
        e &&
        "code" in e &&
        (e as { code?: unknown }).code === "ER_DUP_ENTRY"
      )
        throw AppError.conflict("Role key already exists.");
      throw e;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (e) {
      if (isReferenced(e))
        throw AppError.conflict(
          "Role cannot be force deleted because access assignments reference it."
        );
      throw e;
    }
  }
}
function normalize(v: RoleSavePayload) {
  const key = v.key.trim().toLowerCase();
  return {
    description: v.description.trim(),
    key,
    label: v.label.trim(),
    status: v.status
  };
}

function isReferenced(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    (("code" in e && (e as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2") ||
      ("errno" in e && (e as { errno?: unknown }).errno === 1451))
  );
}
