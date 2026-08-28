import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const planningMigration = {
  description: "NEOT-owned project planning whiteboards.",
  key: "neot.planning.sql.v2",
} as const;

export async function migratePlanningModule(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_planning_boards (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      project_uuid CHAR(8) NULL,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL,
      scene_json LONGTEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(240) NOT NULL,
      updated_by VARCHAR(240) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      sync_direction VARCHAR(16) NOT NULL DEFAULT 'local',
      sync_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      sync_version INT UNSIGNED NOT NULL DEFAULT 1,
      sync_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_planning_boards_uuid (uuid),
      KEY idx_neot_planning_boards_project (project_uuid),
      KEY idx_neot_planning_boards_status (status, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`
    CREATE TABLE IF NOT EXISTS neot_planning_board_links (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      board_uuid CHAR(8) NOT NULL,
      record_kind VARCHAR(24) NOT NULL,
      record_uuid CHAR(8) NOT NULL,
      created_by VARCHAR(240) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sync_direction VARCHAR(16) NOT NULL DEFAULT 'local',
      sync_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      sync_version INT UNSIGNED NOT NULL DEFAULT 1,
      sync_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_planning_board_links_uuid (uuid),
      UNIQUE KEY uq_neot_planning_board_record (board_uuid, record_kind, record_uuid),
      KEY idx_neot_planning_record (record_kind, record_uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`
    CREATE TABLE IF NOT EXISTS neot_planning_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      board_uuid CHAR(8) NOT NULL,
      element_id VARCHAR(64) NULL,
      body TEXT NOT NULL,
      mentions_json TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'open',
      created_by VARCHAR(240) NOT NULL,
      updated_by VARCHAR(240) NOT NULL,
      resolved_by VARCHAR(240) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL,
      sync_direction VARCHAR(16) NOT NULL DEFAULT 'local',
      sync_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      sync_version INT UNSIGNED NOT NULL DEFAULT 1,
      sync_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_planning_comments_uuid (uuid),
      KEY idx_neot_planning_comments_board (board_uuid, status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`
    CREATE TABLE IF NOT EXISTS neot_planning_reactions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      comment_uuid CHAR(8) NOT NULL,
      reaction VARCHAR(24) NOT NULL,
      created_by VARCHAR(240) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sync_direction VARCHAR(16) NOT NULL DEFAULT 'local',
      sync_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      sync_version INT UNSIGNED NOT NULL DEFAULT 1,
      sync_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_planning_reactions_uuid (uuid),
      UNIQUE KEY uq_neot_planning_reaction_actor (comment_uuid, reaction, created_by),
      KEY idx_neot_planning_reactions_comment (comment_uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  return planningMigration;
}
