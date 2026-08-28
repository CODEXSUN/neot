import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import type {
  User,
  UserListFilters,
  UserSavePayload,
  UserStatus
} from "./user.types.js";

type Row = {
  email: string;
  id: number;
  is_protected: number | boolean;
  name: string;
  role: string;
  status: UserStatus;
  uuid: string;
};

export class UserRepository {
  constructor(private readonly database: Kysely<PlatformDatabase>) {}
  async list(filters: UserListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const result = await sql<Row>`SELECT id,uuid,name,email,role,status,is_protected FROM users
      WHERE (${filters.search ?? ""}='' OR LOWER(name) LIKE ${term} OR LOWER(email) LIKE ${term}) ORDER BY name`.execute(
      this.database
    );
    return result.rows.map(mapRow);
  }
  async find(id: string | number) {
    const result = await sql<Row>`SELECT id,uuid,name,email,role,status,is_protected
      FROM users WHERE id=${Number(id)} LIMIT 1`.execute(this.database);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async findByEmail(email: string) {
    const result = await sql<Row>`SELECT id,uuid,name,email,role,status,is_protected
      FROM users WHERE LOWER(email)=LOWER(${email.trim()}) LIMIT 1`.execute(this.database);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async listActiveReferences() {
    const rows = await this.database
      .selectFrom("users")
      .select(["id", "uuid", "name", "email"])
      .where("status", "=", "active")
      .orderBy("name", "asc")
      .execute();
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }
  async findActiveReference(id: number) {
    const row = await this.database
      .selectFrom("users")
      .select(["id", "uuid", "name", "email"])
      .where("id", "=", id)
      .where("status", "=", "active")
      .executeTakeFirst();
    return row ? { ...row, id: Number(row.id) } : null;
  }
  async create(input: UserSavePayload, uuid: string, passwordHash: string) {
    const result = await sql`INSERT INTO users
      (uuid,name,email,password_hash,role,status,is_protected)
      VALUES (${uuid},${input.name},${input.email},${passwordHash},'user',${input.status},FALSE)`.execute(
      this.database
    );
    return (await this.find(Number(result.insertId)))!;
  }
  async update(id: number, input: UserSavePayload, passwordHash?: string) {
    if (passwordHash)
      await sql`UPDATE users SET name=${input.name},email=${input.email},password_hash=${passwordHash},status=${input.status} WHERE id=${id}`.execute(
        this.database
      );
    else
      await sql`UPDATE users SET name=${input.name},email=${input.email},status=${input.status} WHERE id=${id}`.execute(
        this.database
      );
    return this.find(id);
  }
  async updateProfile(id: number, input: { email: string; name: string }, passwordHash?: string) {
    if (passwordHash)
      await sql`UPDATE users SET name=${input.name},email=${input.email},password_hash=${passwordHash} WHERE id=${id}`.execute(
        this.database
      );
    else
      await sql`UPDATE users SET name=${input.name},email=${input.email} WHERE id=${id}`.execute(
        this.database
      );
    return this.find(id);
  }
  async setStatus(id: number, status: UserStatus) {
    await sql`UPDATE users SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async dependentCount(id: number) {
    const result = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM user_roles WHERE user_id=${id}`.execute(this.database);
    return Number(result.rows[0]?.count ?? 0);
  }
  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM users WHERE id=${id}`.execute(this.database);
    return record;
  }
}
function mapRow(row: Row): User {
  return {
    email: row.email,
    id: Number(row.id),
    isProtected: Boolean(row.is_protected),
    name: row.name,
    role: row.role,
    status: row.status,
    uuid: row.uuid
  };
}
