import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import type {
  Permission,
  PermissionListFilters,
  PermissionSavePayload,
  PermissionStatus
} from "./permission.types.js";
type Row = {
  description: string;
  id: number;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: PermissionStatus;
  uuid: string;
};
export class PermissionRepository {
  constructor(private database: Kysely<PlatformDatabase>) {}
  async list(filters: PermissionListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const r =
      await sql<Row>`SELECT id,uuid,\`key\`,label,description,status,is_protected FROM permissions WHERE (${filters.search ?? ""}='' OR LOWER(\`key\`) LIKE ${term} OR LOWER(label) LIKE ${term}) ORDER BY \`key\``.execute(
        this.database
      );
    return r.rows.map(map);
  }
  async find(id: string | number) {
    const r =
      await sql<Row>`SELECT id,uuid,\`key\`,label,description,status,is_protected FROM permissions WHERE id=${Number(id)} LIMIT 1`.execute(
        this.database
      );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  async create(v: PermissionSavePayload, uuid: string) {
    const r =
      await sql`INSERT INTO permissions (uuid,\`key\`,label,description,status,is_protected) VALUES (${uuid},${v.key},${v.label},${v.description},${v.status},FALSE)`.execute(
        this.database
      );
    return (await this.find(Number(r.insertId)))!;
  }
  async update(id: number, v: PermissionSavePayload) {
    await sql`UPDATE permissions SET \`key\`=${v.key},label=${v.label},description=${v.description},status=${v.status} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }
  async setStatus(id: number, status: PermissionStatus) {
    await sql`UPDATE permissions SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async dependentCount(id: number) {
    const r = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM role_permissions WHERE permission_id=${id}`.execute(
      this.database
    );
    return Number(r.rows[0]?.count ?? 0);
  }
  async forceDelete(id: number) {
    const r = await this.find(id);
    if (!r) return null;
    await sql`DELETE FROM permissions WHERE id=${id}`.execute(this.database);
    return r;
  }
}
function map(r: Row): Permission {
  return {
    description: r.description,
    id: Number(r.id),
    isProtected: Boolean(r.is_protected),
    key: r.key,
    label: r.label,
    status: r.status,
    uuid: r.uuid
  };
}
