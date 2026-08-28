import { sql, type Kysely } from "kysely";
import { renameLegacyTable } from "../../database/database-utils.js";
import type { NEOTDatabase } from "../../database/schema.js";

export const taskManagerMigration = {
  description: "Private user-owned Task Manager todos, project links, lookups, and activity.",
  key: "neot.task-manager.sql.v4"
} as const;

export async function migrateTaskManagerModule(database: Kysely<NEOTDatabase>) {
  const tables = [
    ["task_manager_todos", "neot_task_manager_todos"],
    ["task_manager_lookups", "neot_task_manager_lookups"],
    ["task_manager_activity", "neot_task_manager_activity"]
  ] as const;
  for (const [legacyName, ownedName] of tables) {
    await renameLegacyTable(database, legacyName, ownedName);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS neot_task_manager_todos (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      scope_key VARCHAR(80) NOT NULL,
      owner_email VARCHAR(240) NOT NULL,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'work',
      group_name VARCHAR(120) NOT NULL DEFAULT '',
      project_uuid CHAR(36) NOT NULL DEFAULT '',
      status VARCHAR(24) NOT NULL DEFAULT 'open',
      priority VARCHAR(24) NOT NULL DEFAULT 'medium',
      due_date VARCHAR(16) NOT NULL DEFAULT '',
      position INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_task_manager_todos_uuid (uuid),
      KEY idx_neot_task_manager_todos_owner_order
        (scope_key, owner_email, position, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`ALTER TABLE neot_task_manager_todos
    ADD COLUMN IF NOT EXISTS project_uuid CHAR(36) NOT NULL DEFAULT '' AFTER group_name`.execute(
    database
  );

  await sql`ALTER TABLE neot_task_manager_todos
    ADD COLUMN IF NOT EXISTS owner_email VARCHAR(240) NOT NULL DEFAULT '' AFTER scope_key`.execute(
    database
  );

  await sql`
    CREATE TABLE IF NOT EXISTS neot_task_manager_lookups (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      scope_key VARCHAR(80) NOT NULL,
      kind VARCHAR(24) NOT NULL,
      name VARCHAR(120) NOT NULL,
      value VARCHAR(120) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_task_manager_lookups_uuid (uuid),
      UNIQUE KEY uq_neot_task_manager_lookups_scope_kind_name (scope_key, kind, name),
      UNIQUE KEY uq_neot_task_manager_lookups_scope_kind_value (scope_key, kind, value)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_task_manager_activity (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      actor_email VARCHAR(240) NOT NULL,
      action VARCHAR(80) NOT NULL,
      record_uuid CHAR(8) NOT NULL,
      details_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_task_manager_activity_uuid (uuid),
      KEY idx_neot_task_manager_activity_record (record_uuid, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    UPDATE neot_task_manager_todos AS todo
    SET todo.owner_email = COALESCE(
      (
        SELECT activity.actor_email
        FROM neot_task_manager_activity AS activity
        WHERE activity.record_uuid = todo.uuid AND activity.action = 'created'
        ORDER BY activity.created_at ASC
        LIMIT 1
      ),
      ''
    )
    WHERE todo.owner_email = ''
  `.execute(database);

  await sql`ALTER TABLE neot_task_manager_todos
    ADD INDEX IF NOT EXISTS idx_neot_task_manager_todos_owner_order
      (scope_key, owner_email, position, updated_at)`.execute(database);

  return taskManagerMigration;
}
