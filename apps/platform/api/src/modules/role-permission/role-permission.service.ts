import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { recordAuditEvent } from "../../database/audit.js";
import { RolePermissionRepository } from "./role-permission.repository.js";
import type {
  RolePermission,
  RolePermissionContext,
  RolePermissionListFilters,
  RolePermissionSavePayload,
  RolePermissionStatus
} from "./role-permission.types.js";
export class RolePermissionService {
  private repository;
  constructor(private context: RolePermissionContext) {
    this.repository = new RolePermissionRepository(context.database);
  }
  async list(f: RolePermissionListFilters = {}) {
    await this.context.authorize("identity.role-permission.view");
    return this.repository.list(f);
  }
  async get(id: string) {
    await this.context.authorize("identity.role-permission.view");
    return this.repository.find(id);
  }
  async create(v: RolePermissionSavePayload) {
    await this.context.authorize("identity.role-permission.assign");
    await this.validate(v);
    const r = await this.save(() => this.repository.create(v, randomBytes(4).toString("hex")));
    await this.audit("assigned", r);
    return r;
  }
  async update(id: string, v: RolePermissionSavePayload) {
    await this.context.authorize("identity.role-permission.update");
    const c = await this.mutable(id);
    await this.validate(v);
    const r = (await this.save(() => this.repository.update(c.id, v)))!;
    await this.audit("updated", r);
    return r;
  }
  async setStatus(id: string, status: RolePermissionStatus) {
    await this.context.authorize("identity.role-permission.update");
    const c = await this.mutable(id);
    const r = (await this.repository.setStatus(c.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", r);
    return r;
  }
  async forceDelete(id: string) {
    await this.context.authorize("identity.role-permission.remove");
    const c = await this.mutable(id),
      r = await this.delete(c.id);
    await this.audit("removed", r);
    return r;
  }
  private async validate(v: RolePermissionSavePayload) {
    const p = await this.repository.parents(v);
    if (!p.role) throw AppError.validation("Active role was not found.");
    if (!p.permission) throw AppError.validation("Active permission was not found.");
  }
  private async mutable(id: string): Promise<RolePermission> {
    const r = await this.repository.find(id);
    if (!r) throw AppError.notFound("Role-permission assignment was not found.");
    if (r.isProtected)
      throw AppError.forbidden("Protected role-permission assignments cannot be modified.");
    return r;
  }
  private audit(action: string, r: RolePermission) {
    return recordAuditEvent({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "identity.role-permission",
      recordId: r.id,
      recordLabel: `${r.roleLabel} · ${r.permissionLabel}`,
      recordUuid: r.uuid
    });
  }
  private async save<T>(f: () => Promise<T>) {
    try {
      return await f();
    } catch (e) {
      if (
        typeof e === "object" &&
        e &&
        "code" in e &&
        (e as { code?: unknown }).code === "ER_DUP_ENTRY"
      )
        throw AppError.conflict("This role already has the selected permission.");
      throw e;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (e) {
      if (isReferenced(e))
        throw AppError.conflict(
          "Role-permission assignment cannot be removed because related records reference it."
        );
      throw e;
    }
  }
}

function isReferenced(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    (("code" in e && (e as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2") ||
      ("errno" in e && (e as { errno?: unknown }).errno === 1451))
  );
}
