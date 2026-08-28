import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import type {
  UserRole,
  UserRoleListFilters,
  UserRoleSavePayload,
  UserRoleStatus
} from "./user-role.types.js";
type Row = {
  id: number;
  is_protected: boolean | number;
  role_id: number;
  role_key: string;
  role_label: string;
  status: UserRoleStatus;
  user_email: string;
  user_id: number;
  user_name: string;
  uuid: string;
};
export class UserRoleRepository {
  constructor(private database: Kysely<PlatformDatabase>) {}
  async list(f: UserRoleListFilters = {}) {
    const term = `%${(f.search ?? "").trim().toLowerCase()}%`;
    const r =
      await sql<Row>`SELECT ur.id,ur.uuid,ur.user_id,ur.role_id,ur.status,ur.is_protected,u.name user_name,u.email user_email,r.label role_label,r.\`key\` role_key FROM user_roles ur INNER JOIN users u ON u.id=ur.user_id INNER JOIN roles r ON r.id=ur.role_id WHERE u.is_protected=FALSE AND (${f.search ?? ""}='' OR LOWER(u.name) LIKE ${term} OR LOWER(u.email) LIKE ${term} OR LOWER(r.label) LIKE ${term}) ORDER BY u.name,r.label`.execute(
        this.database
      );
    return r.rows.map(map);
  }
  async find(id: string | number) {
    const r =
      await sql<Row>`SELECT ur.id,ur.uuid,ur.user_id,ur.role_id,ur.status,ur.is_protected,u.name user_name,u.email user_email,r.label role_label,r.\`key\` role_key FROM user_roles ur INNER JOIN users u ON u.id=ur.user_id INNER JOIN roles r ON r.id=ur.role_id WHERE ur.id=${Number(id)} AND u.is_protected=FALSE LIMIT 1`.execute(
        this.database
      );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  async findByUserAndRoleKey(userId: number, roleKey: string) {
    const r =
      await sql<Row>`SELECT ur.id,ur.uuid,ur.user_id,ur.role_id,ur.status,ur.is_protected,u.name user_name,u.email user_email,r.label role_label,r.\`key\` role_key FROM user_roles ur INNER JOIN users u ON u.id=ur.user_id INNER JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=${userId} AND r.\`key\`=${roleKey} LIMIT 1`.execute(
        this.database
      );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  async parents(v: UserRoleSavePayload) {
    const r = await sql<{
      role_count: number | string;
      user_count: number | string;
    }>`SELECT (SELECT COUNT(*) FROM users WHERE id=${v.userId} AND status='active' AND is_protected=FALSE) user_count,(SELECT COUNT(*) FROM roles WHERE id=${v.roleId} AND status='active') role_count`.execute(
      this.database
    );
    return {
      role: Boolean(Number(r.rows[0]?.role_count ?? 0)),
      user: Boolean(Number(r.rows[0]?.user_count ?? 0))
    };
  }
  async create(v: UserRoleSavePayload, uuid: string) {
    const r =
      await sql`INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected) VALUES (${uuid},${v.userId},${v.roleId},${v.status},FALSE)`.execute(
        this.database
      );
    return (await this.find(Number(r.insertId)))!;
  }
  async ensureActiveByRoleKey(userId: number, roleKey: string, uuid: string) {
    const parents = await sql<{
      role_id: number | null;
      user_count: number | string;
    }>`SELECT (SELECT id FROM roles WHERE \`key\`=${roleKey} AND status='active' LIMIT 1) role_id,(SELECT COUNT(*) FROM users WHERE id=${userId}) user_count`.execute(
      this.database
    );
    const roleId = Number(parents.rows[0]?.role_id ?? 0);
    if (!Number(parents.rows[0]?.user_count ?? 0) || !roleId) return null;
    await sql`INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected) VALUES (${uuid},${userId},${roleId},'active',FALSE) ON DUPLICATE KEY UPDATE status='active'`.execute(
      this.database
    );
    return this.findByUserAndRoleKey(userId, roleKey);
  }
  async setPrimaryRole(userId: number, roleId: number, uuid: string) {
    const parent = await sql<{
      role_key: string | null;
      user_count: number | string;
    }>`SELECT
      (SELECT \`key\` FROM roles WHERE id=${roleId} AND status='active' LIMIT 1) role_key,
      (SELECT COUNT(*) FROM users WHERE id=${userId}) user_count`.execute(this.database);
    const roleKey = parent.rows[0]?.role_key;
    if (!roleKey || !Number(parent.rows[0]?.user_count ?? 0)) return null;
    await sql`UPDATE user_roles SET status='inactive'
      WHERE user_id=${userId} AND role_id<>${roleId} AND is_protected=FALSE`.execute(this.database);
    await sql`INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected)
      VALUES (${uuid},${userId},${roleId},'active',FALSE)
      ON DUPLICATE KEY UPDATE status='active'`.execute(this.database);
    await sql`UPDATE users SET role=${roleKey} WHERE id=${userId}`.execute(this.database);
    return this.findByUserAndRoleKey(userId, roleKey);
  }
  async update(id: number, v: UserRoleSavePayload) {
    await sql`UPDATE user_roles SET user_id=${v.userId},role_id=${v.roleId},status=${v.status} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }
  async setStatus(id: number, status: UserRoleStatus) {
    await sql`UPDATE user_roles SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async forceDelete(id: number) {
    const r = await this.find(id);
    if (!r) return null;
    await sql`DELETE FROM user_roles WHERE id=${id}`.execute(this.database);
    return r;
  }
}
function map(r: Row): UserRole {
  return {
    id: Number(r.id),
    isProtected: Boolean(r.is_protected),
    roleId: Number(r.role_id),
    roleKey: r.role_key,
    roleLabel: r.role_label,
    status: r.status,
    userEmail: r.user_email,
    userId: Number(r.user_id),
    userName: r.user_name,
    uuid: r.uuid
  };
}
