import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import type { Role, RoleListFilters, RoleSavePayload, RoleStatus } from "./role.types.js";
type Row = {
  description: string;
  id: number;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: RoleStatus;
  uuid: string;
};
export class RoleRepository {
  constructor(private database: Kysely<PlatformDatabase>) {}
  async list(filters: RoleListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const r =
      await sql<Row>`SELECT id,uuid,\`key\`,label,description,status,is_protected FROM roles WHERE (${filters.search ?? ""}='' OR LOWER(\`key\`) LIKE ${term} OR LOWER(label) LIKE ${term}) ORDER BY label`.execute(
        this.database
      );
    return r.rows.map(map);
  }
  async find(id: string | number) {
    const r =
      await sql<Row>`SELECT id,uuid,\`key\`,label,description,status,is_protected FROM roles WHERE id=${Number(id)} LIMIT 1`.execute(
        this.database
      );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  async create(input: RoleSavePayload, uuid: string) {
    const r =
      await sql`INSERT INTO roles (uuid,\`key\`,label,description,status,is_protected) VALUES (${uuid},${input.key},${input.label},${input.description},${input.status},FALSE)`.execute(
        this.database
      );
    return (await this.find(Number(r.insertId)))!;
  }
  async update(id: number, input: RoleSavePayload) {
    await sql`UPDATE roles SET \`key\`=${input.key},label=${input.label},description=${input.description},status=${input.status} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }
  async setStatus(id: number, status: RoleStatus) {
    await sql`UPDATE roles SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async dependentCounts(id: number) {
    const a = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM user_roles WHERE role_id=${id}`.execute(this.database);
    const b = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM role_permissions WHERE role_id=${id}`.execute(this.database);
    return {
      rolePermissions: Number(b.rows[0]?.count ?? 0),
      userRoles: Number(a.rows[0]?.count ?? 0)
    };
  }
  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM roles WHERE id=${id}`.execute(this.database);
    return record;
  }
}
function map(row: Row): Role {
  return {
    description: row.description,
    id: Number(row.id),
    isProtected: Boolean(row.is_protected),
    key: row.key,
    label: row.label,
    status: row.status,
    uuid: row.uuid
  };
}
