import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const syncMigration = {
  description:
    "NEOT cloud tokens, local bindings, canonical snapshots, runs, conflicts, and per-record sync state.",
  key: "neot.sync.sql.v1"
} as const;

const ownedTables = [
  "neot_planning_boards",
  "neot_planning_board_links",
  "neot_planning_comments",
  "neot_planning_reactions",
  "neot_project_manager_items",
  "neot_project_manager_registry_platforms",
  "neot_project_manager_registry_groups",
  "neot_project_manager_registry_modules",
  "neot_project_manager_activity",
  "neot_project_manager_attachments",
  "neot_task_manager_todos",
  "neot_task_manager_lookups",
  "neot_task_manager_activity"
] as const;

export async function migrateSyncModule(database: Kysely<NEOTDatabase>) {
  for (const table of ownedTables) {
    await sql
      .raw(
        `
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS sync_direction VARCHAR(16) NOT NULL DEFAULT 'local',
      ADD COLUMN IF NOT EXISTS sync_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS sync_version INT UNSIGNED NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS sync_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
      )
      .execute(database);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS neot_sync_tokens (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      label VARCHAR(160) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(240) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME NULL,
      UNIQUE KEY uq_neot_sync_tokens_uuid (uuid),
      UNIQUE KEY uq_neot_sync_tokens_hash (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_sync_connections (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      server_id VARCHAR(160) NOT NULL,
      server_url VARCHAR(300) NOT NULL,
      encrypted_token TEXT NOT NULL,
      instance_id VARCHAR(160) NOT NULL,
      remote_revision INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'bound',
      last_error TEXT NULL,
      last_verified_at DATETIME NULL,
      last_published_at DATETIME NULL,
      last_pulled_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_sync_connections_server (server_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    ALTER TABLE neot_sync_connections
    ADD COLUMN IF NOT EXISTS last_verified_at DATETIME NULL AFTER last_error
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_sync_snapshots (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      server_id VARCHAR(160) NOT NULL,
      revision INT UNSIGNED NOT NULL,
      checksum CHAR(64) NOT NULL,
      payload_json LONGTEXT NOT NULL,
      published_by VARCHAR(160) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_sync_snapshots_revision (server_id, revision),
      KEY idx_neot_sync_snapshots_latest (server_id, revision)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_sync_runs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      direction VARCHAR(16) NOT NULL,
      status VARCHAR(24) NOT NULL,
      local_revision INT UNSIGNED NOT NULL,
      remote_revision INT UNSIGNED NOT NULL,
      record_count INT UNSIGNED NOT NULL DEFAULT 0,
      error_message TEXT NULL,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      UNIQUE KEY uq_neot_sync_runs_uuid (uuid),
      KEY idx_neot_sync_runs_started (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS neot_sync_conflicts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      table_name VARCHAR(160) NOT NULL,
      record_uuid VARCHAR(160) NOT NULL,
      local_version INT UNSIGNED NOT NULL,
      remote_version INT UNSIGNED NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'open',
      details_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL,
      UNIQUE KEY uq_neot_sync_conflicts_uuid (uuid),
      KEY idx_neot_sync_conflicts_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  return syncMigration;
}
