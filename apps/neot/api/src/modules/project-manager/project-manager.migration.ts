import { sql, type Kysely } from "kysely";
import { renameLegacyTable } from "../../database/database-utils.js";
import type { NEOTDatabase } from "../../database/schema.js";

export const projectManagerMigration = {
  description:
    "Project Manager records, attachments, project roadmaps, registry hierarchy, and audit activity.",
  key: "neot.project-manager.sql.v7"
} as const;

export async function migrateProjectManagerModule(database: Kysely<NEOTDatabase>) {
  await renameProjectManagerTables(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_project_manager_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      kind VARCHAR(24) NOT NULL,
      item_key VARCHAR(160) NOT NULL,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL,
      assignee VARCHAR(160) NOT NULL DEFAULT '',
      due_date VARCHAR(16) NOT NULL DEFAULT '',
      lane VARCHAR(120) NOT NULL DEFAULT '',
      logo_text VARCHAR(4) NOT NULL DEFAULT '',
      color_key VARCHAR(24) NOT NULL DEFAULT '',
      repository_name VARCHAR(160) NOT NULL DEFAULT '',
      repository_url VARCHAR(500) NOT NULL DEFAULT '',
      module_key VARCHAR(160) NOT NULL DEFAULT 'project-manager',
      priority VARCHAR(24) NOT NULL DEFAULT 'medium',
      reference_id VARCHAR(160) NOT NULL DEFAULT '',
      reference_type VARCHAR(80) NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      start_date VARCHAR(16) NOT NULL DEFAULT '',
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      item_type VARCHAR(80) NOT NULL DEFAULT '',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_project_manager_items_uuid (uuid),
      UNIQUE KEY uq_neot_project_manager_items_kind_key (kind, item_key),
      KEY idx_neot_project_manager_items_kind_order (kind, sort_order, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_repository_connections (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      name VARCHAR(160) NOT NULL,
      provider VARCHAR(40) NOT NULL DEFAULT 'github',
      base_url VARCHAR(500) NOT NULL,
      repository_slug VARCHAR(240) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_repository_connections_uuid (uuid),
      UNIQUE KEY uq_neot_repository_connections_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    ALTER TABLE neot_project_manager_items
    ADD COLUMN IF NOT EXISTS start_date VARCHAR(16) NOT NULL DEFAULT '' AFTER sort_order
  `.execute(database);

  await sql`
    ALTER TABLE neot_project_manager_items
    ADD COLUMN IF NOT EXISTS logo_text VARCHAR(4) NOT NULL DEFAULT '' AFTER lane,
    ADD COLUMN IF NOT EXISTS color_key VARCHAR(24) NOT NULL DEFAULT '' AFTER logo_text,
    ADD COLUMN IF NOT EXISTS repository_name VARCHAR(160) NOT NULL DEFAULT '' AFTER color_key,
    ADD COLUMN IF NOT EXISTS repository_url VARCHAR(500) NOT NULL DEFAULT '' AFTER repository_name
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_project_manager_registry_platforms (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      platform_key VARCHAR(160) NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_project_manager_platforms_uuid (uuid),
      UNIQUE KEY uq_project_manager_platforms_key (platform_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_project_manager_registry_groups (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      platform_uuid CHAR(8) NOT NULL,
      parent_group_uuid CHAR(8) NULL,
      group_key VARCHAR(160) NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_project_manager_groups_uuid (uuid),
      UNIQUE KEY uq_project_manager_groups_key (group_key),
      KEY idx_project_manager_groups_platform (platform_uuid, parent_group_uuid, sort_order),
      CONSTRAINT fk_project_manager_groups_platform
        FOREIGN KEY (platform_uuid) REFERENCES neot_project_manager_registry_platforms (uuid),
      CONSTRAINT fk_project_manager_groups_parent
        FOREIGN KEY (parent_group_uuid) REFERENCES neot_project_manager_registry_groups (uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_project_manager_registry_modules (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      group_uuid CHAR(8) NOT NULL,
      parent_module_uuid CHAR(8) NULL,
      module_key VARCHAR(200) NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      module_type VARCHAR(24) NOT NULL DEFAULT 'module',
      route_path VARCHAR(300) NOT NULL DEFAULT '',
      documentation_json LONGTEXT NOT NULL,
      planning_notes_json LONGTEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_project_manager_modules_uuid (uuid),
      UNIQUE KEY uq_project_manager_modules_key (module_key),
      KEY idx_project_manager_modules_group (group_uuid, parent_module_uuid, sort_order),
      CONSTRAINT fk_project_manager_modules_group
        FOREIGN KEY (group_uuid) REFERENCES neot_project_manager_registry_groups (uuid),
      CONSTRAINT fk_project_manager_modules_parent
        FOREIGN KEY (parent_module_uuid) REFERENCES neot_project_manager_registry_modules (uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_project_manager_activity (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      actor_email VARCHAR(240) NOT NULL,
      action VARCHAR(80) NOT NULL,
      record_kind VARCHAR(80) NOT NULL,
      record_uuid CHAR(8) NOT NULL,
      details_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_project_manager_activity_uuid (uuid),
      KEY idx_neot_project_manager_activity_record (record_kind, record_uuid, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_project_manager_attachments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      record_kind VARCHAR(24) NOT NULL,
      record_uuid CHAR(8) NOT NULL,
      original_name VARCHAR(240) NOT NULL,
      storage_key VARCHAR(500) NOT NULL,
      mime_type VARCHAR(120) NOT NULL,
      size_bytes INT UNSIGNED NOT NULL,
      checksum CHAR(64) NOT NULL,
      created_by VARCHAR(240) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_project_manager_attachments_uuid (uuid),
      UNIQUE KEY uq_neot_project_manager_attachments_storage_key (storage_key),
      KEY idx_neot_project_manager_attachments_record (record_kind, record_uuid, created_at),
      CONSTRAINT fk_neot_project_manager_attachments_record
        FOREIGN KEY (record_uuid) REFERENCES neot_project_manager_items (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  return projectManagerMigration;
}

async function renameProjectManagerTables(database: Kysely<NEOTDatabase>) {
  const tables = [
    ["project_manager_items", "neot_project_manager_items"],
    ["project_manager_registry_platforms", "neot_project_manager_registry_platforms"],
    ["project_manager_registry_groups", "neot_project_manager_registry_groups"],
    ["project_manager_registry_modules", "neot_project_manager_registry_modules"],
    ["project_manager_activity", "neot_project_manager_activity"],
    ["project_manager_attachments", "neot_project_manager_attachments"]
  ] as const;
  for (const [legacyName, ownedName] of tables) {
    await renameLegacyTable(database, legacyName, ownedName);
  }
}
