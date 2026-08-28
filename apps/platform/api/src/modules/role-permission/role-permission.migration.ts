import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export const rolePermissionMigration = {
  key: "identity.role-permission.foundation-v1"
} as const;
export async function migrateRolePermissionModule(database: Kysely<PlatformDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS role_permissions (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,uuid VARCHAR(8) NOT NULL UNIQUE,role_id INT NOT NULL,permission_id INT NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'active',is_protected BOOLEAN NOT NULL DEFAULT FALSE,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY role_permissions_pair_unique (role_id,permission_id),CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES roles(id),CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions(id)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  if (!(await column(database, "id"))) {
    await sql
      .raw(
        "ALTER TABLE role_permissions DROP PRIMARY KEY, ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST, ADD UNIQUE KEY role_permissions_pair_unique (role_id,permission_id)"
      )
      .execute(database);
  }
  if (!(await column(database, "uuid"))) {
    await sql
      .raw("ALTER TABLE role_permissions ADD COLUMN uuid VARCHAR(8) NULL AFTER id")
      .execute(database);
    await sql
      .raw(
        "UPDATE role_permissions SET uuid=LOWER(SUBSTRING(MD5(CONCAT('role-permission:',role_id,':',permission_id)),1,8)) WHERE uuid IS NULL"
      )
      .execute(database);
    await sql
      .raw(
        "ALTER TABLE role_permissions MODIFY uuid VARCHAR(8) NOT NULL, ADD UNIQUE KEY role_permissions_uuid_unique (uuid)"
      )
      .execute(database);
  }
  for (const [name, definition] of [
    ["status", "VARCHAR(24) NOT NULL DEFAULT 'active' AFTER permission_id"],
    ["is_protected", "BOOLEAN NOT NULL DEFAULT FALSE AFTER status"],
    ["created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_protected"],
    [
      "updated_at",
      "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at"
    ]
  ] as const)
    if (!(await column(database, name)))
      await sql
        .raw(`ALTER TABLE role_permissions ADD COLUMN \`${name}\` ${definition}`)
        .execute(database);
  await addFk(database, "role_permissions_role_fk", "role_id", "roles");
  await addFk(database, "role_permissions_permission_fk", "permission_id", "permissions");
  await database
    .insertInto("schema_migrations")
    .ignore()
    .values({ name: rolePermissionMigration.key })
    .execute();
}
async function column(db: Kysely<PlatformDatabase>, name: string) {
  const r = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='role_permissions' AND COLUMN_NAME=${name}`.execute(
    db
  );
  return Number(r.rows[0]?.count ?? 0) > 0;
}
async function addFk(db: Kysely<PlatformDatabase>, name: string, col: string, parent: string) {
  const r = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='role_permissions' AND CONSTRAINT_NAME=${name}`.execute(
    db
  );
  if (!Number(r.rows[0]?.count ?? 0))
    await sql
      .raw(
        `ALTER TABLE role_permissions ADD CONSTRAINT \`${name}\` FOREIGN KEY (\`${col}\`) REFERENCES \`${parent}\`(id)`
      )
      .execute(db);
}
