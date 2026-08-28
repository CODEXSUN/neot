import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export const roleMigrations = [
  { key: "identity.role.foundation-v1" },
  { key: "identity.role.single-client-v2" }
] as const;
export const roleMigration = roleMigrations[0];

export async function migrateRoleModule(database: Kysely<PlatformDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS roles (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(8) NOT NULL UNIQUE,
        \`key\` VARCHAR(120) NOT NULL UNIQUE,
        label VARCHAR(160) NOT NULL,
        description VARCHAR(500) NOT NULL DEFAULT '',
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        is_protected BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  for (const [column, definition] of [
    ["description", "VARCHAR(500) NOT NULL DEFAULT '' AFTER label"],
    ["is_protected", "BOOLEAN NOT NULL DEFAULT FALSE AFTER status"]
  ] as const) {
    if (!(await columnExists(database, column))) {
      await sql.raw(`ALTER TABLE roles ADD COLUMN \`${column}\` ${definition}`).execute(database);
    }
  }
  await database
    .insertInto("schema_migrations")
    .ignore()
    .values(roleMigrations.map(({ key }) => ({ name: key })))
    .execute();
}

async function columnExists(database: Kysely<PlatformDatabase>, column: string) {
  const result = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='roles' AND COLUMN_NAME=${column}
  `.execute(database);
  return Number(result.rows[0]?.count ?? 0) > 0;
}
