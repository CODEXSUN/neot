import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import type {
  RolePermission,
  RolePermissionListFilters,
  RolePermissionSavePayload,
  RolePermissionStatus
} from "./role-permission.types.js";
type Row = {
  id: number;
  is_protected: boolean | number;
  permission_id: number;
  permission_key: string;
  permission_label: string;
  role_id: number;
  role_key: string;
  role_label: string;
  status: RolePermissionStatus;
  uuid: string;
};
export class RolePermissionRepository {
  constructor(private database: Kysely<PlatformDatabase>) {}
  async list(f: RolePermissionListFilters = {}) {
    const term = `%${(f.search ?? "").trim().toLowerCase()}%`;
    const r =
      await sql<Row>`SELECT rp.id,rp.uuid,rp.role_id,rp.permission_id,rp.status,rp.is_protected,r.label role_label,r.\`key\` role_key,p.label permission_label,p.\`key\` permission_key FROM role_permissions rp INNER JOIN roles r ON r.id=rp.role_id INNER JOIN permissions p ON p.id=rp.permission_id WHERE (${f.search ?? ""}='' OR LOWER(r.label) LIKE ${term} OR LOWER(p.label) LIKE ${term} OR LOWER(p.\`key\`) LIKE ${term}) ORDER BY r.label,p.\`key\``.execute(
        this.database
      );
    return r.rows.map(map);
  }
  async find(id: string | number) {
    const r =
      await sql<Row>`SELECT rp.id,rp.uuid,rp.role_id,rp.permission_id,rp.status,rp.is_protected,r.label role_label,r.\`key\` role_key,p.label permission_label,p.\`key\` permission_key FROM role_permissions rp INNER JOIN roles r ON r.id=rp.role_id INNER JOIN permissions p ON p.id=rp.permission_id WHERE rp.id=${Number(id)} LIMIT 1`.execute(
        this.database
      );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  async parents(v: RolePermissionSavePayload) {
    const r = await sql<{
      permission_count: number | string;
      role_count: number | string;
    }>`SELECT (SELECT COUNT(*) FROM roles WHERE id=${v.roleId} AND status='active') role_count,(SELECT COUNT(*) FROM permissions WHERE id=${v.permissionId} AND status='active') permission_count`.execute(
      this.database
    );
    return {
      permission: Boolean(Number(r.rows[0]?.permission_count ?? 0)),
      role: Boolean(Number(r.rows[0]?.role_count ?? 0))
    };
  }
  async create(v: RolePermissionSavePayload, uuid: string) {
    const r =
      await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected) VALUES (${uuid},${v.roleId},${v.permissionId},${v.status},FALSE)`.execute(
        this.database
      );
    return (await this.find(Number(r.insertId)))!;
  }
  async update(id: number, v: RolePermissionSavePayload) {
    await sql`UPDATE role_permissions SET role_id=${v.roleId},permission_id=${v.permissionId},status=${v.status} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }
  async setStatus(id: number, status: RolePermissionStatus) {
    await sql`UPDATE role_permissions SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async forceDelete(id: number) {
    const r = await this.find(id);
    if (!r) return null;
    await sql`DELETE FROM role_permissions WHERE id=${id}`.execute(this.database);
    return r;
  }
}
function map(r: Row): RolePermission {
  return {
    id: Number(r.id),
    isProtected: Boolean(r.is_protected),
    permissionId: Number(r.permission_id),
    permissionKey: r.permission_key,
    permissionLabel: r.permission_label,
    roleId: Number(r.role_id),
    roleKey: r.role_key,
    roleLabel: r.role_label,
    status: r.status,
    uuid: r.uuid
  };
}
