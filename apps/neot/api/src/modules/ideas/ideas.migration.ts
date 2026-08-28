import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const ideasMigration = {
  description: "Project idea discussions, engagement, polls, and attachments without foreign keys.",
  key: "neot.ideas.sql.v1"
} as const;

export const ideasAttachmentStorageMigration = {
  description: "Store new idea images on disk while retaining legacy database images.",
  key: "neot.ideas.attachments.storage-key.v2"
} as const;

export const ideasColorsMigration = {
  description: "Persist display colors for idea categories and statuses.",
  key: "neot.ideas.colors.v3"
} as const;

export const ideasVisibilityMigration = {
  description: "Add author-scoped private visibility to project ideas.",
  key: "neot.ideas.visibility.v4"
} as const;

export const ideasPrivateByDefaultMigration = {
  description: "Make newly inserted project ideas private unless explicitly shared later.",
  key: "neot.ideas.private-default.v5"
} as const;

export const ideasAssigneesMigration = {
  description: "Persist verified multi-user assignments for project ideas.",
  key: "neot.ideas.assignees.v6"
} as const;

export async function migrateIdeasModule(database: Kysely<NEOTDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS neot_ideas (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, title VARCHAR(240) NOT NULL,
    excerpt VARCHAR(500) NOT NULL DEFAULT '', content_html LONGTEXT NOT NULL, category VARCHAR(80) NOT NULL DEFAULT 'General',
    tags_json TEXT NOT NULL, project_uuids_json TEXT NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'open',
    author VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_ideas_uuid (uuid), KEY idx_neot_ideas_status_updated (status, updated_at),
    KEY idx_neot_ideas_category (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_idea_comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    parent_uuid CHAR(8) NULL, body_html TEXT NOT NULL, author VARCHAR(240) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_idea_comments_uuid (uuid), KEY idx_neot_idea_comments_idea (idea_uuid, created_at),
    KEY idx_neot_idea_comments_parent (parent_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_idea_likes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, entity_kind VARCHAR(16) NOT NULL,
    entity_uuid CHAR(8) NOT NULL, actor VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_idea_likes_uuid (uuid), UNIQUE KEY uq_neot_idea_likes_actor (entity_kind, entity_uuid, actor),
    KEY idx_neot_idea_likes_entity (entity_kind, entity_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_idea_polls (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    question VARCHAR(300) NOT NULL, options_json TEXT NOT NULL, multiple_choice BOOLEAN NOT NULL DEFAULT FALSE,
    closes_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_idea_polls_uuid (uuid), UNIQUE KEY uq_neot_idea_polls_idea (idea_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_idea_poll_votes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, poll_uuid CHAR(8) NOT NULL,
    option_id VARCHAR(40) NOT NULL, actor VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_idea_poll_votes_uuid (uuid), UNIQUE KEY uq_neot_idea_poll_vote (poll_uuid, option_id, actor),
    KEY idx_neot_idea_poll_votes_poll (poll_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_idea_attachments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    name VARCHAR(240) NOT NULL, mime_type VARCHAR(120) NOT NULL, size_bytes INT UNSIGNED NOT NULL,
    data_base64 LONGTEXT NOT NULL, created_by VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_idea_attachments_uuid (uuid), KEY idx_neot_idea_attachments_idea (idea_uuid, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_idea_drawings (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    scene_json LONGTEXT NOT NULL, updated_by VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_idea_drawings_uuid (uuid), UNIQUE KEY uq_neot_idea_drawings_idea (idea_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return ideasMigration;
}

export async function migrateIdeaAttachmentStorage(database: Kysely<NEOTDatabase>) {
  await sql`ALTER TABLE neot_idea_attachments
    ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500) NULL AFTER data_base64`.execute(database);
  return ideasAttachmentStorageMigration;
}

export async function migrateIdeaColors(database: Kysely<NEOTDatabase>) {
  await sql`ALTER TABLE neot_ideas
    ADD COLUMN IF NOT EXISTS category_color CHAR(7) NOT NULL DEFAULT '#2563eb' AFTER category,
    ADD COLUMN IF NOT EXISTS status_color CHAR(7) NOT NULL DEFAULT '#16a34a' AFTER status`.execute(
    database
  );
  return ideasColorsMigration;
}

export async function migrateIdeaVisibility(database: Kysely<NEOTDatabase>) {
  await sql`ALTER TABLE neot_ideas
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(12) NOT NULL DEFAULT 'public' AFTER status_color`.execute(
    database
  );
  return ideasVisibilityMigration;
}

export async function migrateIdeasPrivateByDefault(database: Kysely<NEOTDatabase>) {
  await sql`ALTER TABLE neot_ideas
    MODIFY COLUMN visibility VARCHAR(12) NOT NULL DEFAULT 'private'`.execute(database);
  return ideasPrivateByDefaultMigration;
}

export async function migrateIdeaAssignees(database: Kysely<NEOTDatabase>) {
  await sql`ALTER TABLE neot_ideas
    ADD COLUMN IF NOT EXISTS assignee_uuids_json TEXT NOT NULL DEFAULT '[]' AFTER visibility`.execute(
    database
  );
  return ideasAssigneesMigration;
}
