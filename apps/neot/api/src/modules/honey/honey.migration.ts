import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const honeyMigration = {
  description: "Versioned Honey knowledge, context, and review controls.",
  key: "neot.honey.sql.v3"
} as const;

export async function migrateHoneyModule(database: Kysely<NEOTDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS neot_honey_threads (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    actor_id VARCHAR(160) NOT NULL, title VARCHAR(240) NOT NULL,
    codex_thread_id VARCHAR(160) NULL, status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_honey_threads_uuid (uuid),
    KEY idx_neot_honey_threads_actor (actor_id, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_honey_messages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    thread_uuid CHAR(16) NOT NULL, actor_id VARCHAR(160) NOT NULL,
    role VARCHAR(16) NOT NULL, body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_honey_messages_uuid (uuid),
    KEY idx_neot_honey_messages_thread (thread_uuid, created_at),
    KEY idx_neot_honey_messages_actor (actor_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_honey_memory (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    actor_id VARCHAR(160) NOT NULL, kind VARCHAR(40) NOT NULL,
    content TEXT NOT NULL, source_thread_uuid CHAR(16) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_honey_memory_uuid (uuid),
    KEY idx_neot_honey_memory_actor (actor_id, status, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`ALTER TABLE neot_honey_messages
    ADD COLUMN IF NOT EXISTS context_json TEXT NOT NULL DEFAULT ('{}') AFTER body`.execute(database);
  await sql`ALTER TABLE neot_honey_memory
    ADD COLUMN IF NOT EXISTS source_label VARCHAR(240) NOT NULL DEFAULT 'Conversation' AFTER source_thread_uuid,
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1 AFTER source_label,
    ADD COLUMN IF NOT EXISTS supersedes_uuid CHAR(16) NULL AFTER version,
    ADD COLUMN IF NOT EXISTS review_note VARCHAR(500) NOT NULL DEFAULT '' AFTER status`.execute(database);
  return honeyMigration;
}
