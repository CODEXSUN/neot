import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const orchestrationChatMigration = {
  description: "User-owned Agent chat conversations with isolated Codex connector routing.",
  key: "neot.orchestration-chat.sql.v4"
} as const;

export async function migrateOrchestrationChat(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_orchestration_chat_threads (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      project_uuid VARCHAR(160) NOT NULL,
      project_key VARCHAR(160) NOT NULL,
      project_title VARCHAR(240) NOT NULL,
      work_item_uuid VARCHAR(160) NULL,
      work_item_key VARCHAR(160) NULL,
      work_item_kind VARCHAR(32) NULL,
      work_item_title VARCHAR(240) NULL,
      title VARCHAR(240) NOT NULL,
      codex_thread_id VARCHAR(240) NULL,
      connection_id VARCHAR(32) NOT NULL DEFAULT 'primary',
      access_mode VARCHAR(32) NOT NULL,
      model VARCHAR(80) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_chat_threads_uuid (uuid),
      KEY idx_neot_chat_threads_actor (actor_id, updated_at),
      KEY idx_neot_chat_threads_actor_project (actor_id, project_uuid, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`ALTER TABLE neot_orchestration_chat_threads ADD COLUMN IF NOT EXISTS work_item_uuid VARCHAR(160) NULL AFTER project_title`.execute(
    database
  );
  await sql`ALTER TABLE neot_orchestration_chat_threads ADD COLUMN IF NOT EXISTS work_item_key VARCHAR(160) NULL AFTER work_item_uuid`.execute(
    database
  );
  await sql`ALTER TABLE neot_orchestration_chat_threads ADD COLUMN IF NOT EXISTS work_item_kind VARCHAR(32) NULL AFTER work_item_key`.execute(
    database
  );
  await sql`ALTER TABLE neot_orchestration_chat_threads ADD COLUMN IF NOT EXISTS work_item_title VARCHAR(240) NULL AFTER work_item_kind`.execute(
    database
  );
  await sql`ALTER TABLE neot_orchestration_chat_threads ADD COLUMN IF NOT EXISTS connection_id VARCHAR(32) NOT NULL DEFAULT 'primary' AFTER codex_thread_id`.execute(
    database
  );
  await sql`
    CREATE TABLE IF NOT EXISTS neot_orchestration_chat_messages (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      thread_uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      role VARCHAR(16) NOT NULL,
      body LONGTEXT NOT NULL,
      actions_json LONGTEXT NOT NULL DEFAULT '[]',
      attachments_json LONGTEXT NOT NULL,
      files_json LONGTEXT NOT NULL,
      duration_ms INT UNSIGNED NULL,
      feedback VARCHAR(16) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_chat_messages_uuid (uuid),
      KEY idx_neot_chat_messages_thread (actor_id, thread_uuid, created_at),
      CONSTRAINT fk_neot_chat_messages_thread
        FOREIGN KEY (thread_uuid) REFERENCES neot_orchestration_chat_threads (uuid)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`ALTER TABLE neot_orchestration_chat_messages ADD COLUMN IF NOT EXISTS actions_json LONGTEXT NOT NULL DEFAULT '[]' AFTER body`.execute(
    database
  );
  return orchestrationChatMigration;
}
