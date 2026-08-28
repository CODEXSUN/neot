import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export const userMigrations = [
  { key: "identity.user.foundation-v1" },
  { key: "identity.user.single-client-v3" },
  { key: "identity.user.local-auth-only-v4" }
] as const;
export const userMigration = userMigrations[0];

export async function migrateUserModule(database: Kysely<PlatformDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(8) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(80) NOT NULL DEFAULT 'user',
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  if (!(await columnExists(database, "users", "is_protected"))) {
    await sql
      .raw("ALTER TABLE users ADD COLUMN is_protected BOOLEAN NOT NULL DEFAULT FALSE AFTER status")
      .execute(database);
  }
  await sql`UPDATE users SET role='admin' WHERE role IN ('super-admin','super_admin','superadmin')`.execute(
    database
  );
  const removedIntegrationPrefix = ["fra", "ppe_"].join("");
  for (const column of [
    `${removedIntegrationPrefix}api_key_ciphertext`,
    `${removedIntegrationPrefix}api_secret_ciphertext`,
    `${removedIntegrationPrefix}verification_status`,
    `${removedIntegrationPrefix}authenticated_user`,
    `${removedIntegrationPrefix}employee_code`,
    `${removedIntegrationPrefix}last_checked_at`,
    `${removedIntegrationPrefix}last_verified_at`
  ]) {
    if (await columnExists(database, "users", column)) {
      await sql.raw(`ALTER TABLE users DROP COLUMN ${column}`).execute(database);
    }
  }
  await database
    .insertInto("schema_migrations")
    .ignore()
    .values(userMigrations.map((migration) => ({ name: migration.key })))
    .execute();
}

async function columnExists(database: Kysely<PlatformDatabase>, table: string, column: string) {
  const result = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND COLUMN_NAME=${column}`.execute(
    database
  );
  return Number(result.rows[0]?.count ?? 0) > 0;
}
