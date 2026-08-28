import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const messagingMigration = {
  description: "NEOT conversations, members, messages, and read state.",
  key: "neot.messaging.sql.v3"
} as const;

export async function migrateMessagingModule(database: Kysely<NEOTDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS neot_messaging_conversations (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL,
    type VARCHAR(16) NOT NULL DEFAULT 'direct',
    title VARCHAR(180) NOT NULL DEFAULT '',
    created_by_uuid VARCHAR(80) NOT NULL,
    last_sequence INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_messaging_conversation_uuid (uuid),
    KEY idx_neot_messaging_conversation_updated (updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_messaging_members (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    conversation_uuid CHAR(8) NOT NULL,
    user_uuid VARCHAR(80) NOT NULL,
    user_name VARCHAR(180) NOT NULL,
    user_email VARCHAR(240) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'member',
    last_read_sequence INT NOT NULL DEFAULT 0,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_messaging_member (conversation_uuid, user_uuid),
    KEY idx_neot_messaging_member_user (user_uuid, conversation_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_messaging_messages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL,
    conversation_uuid CHAR(8) NOT NULL,
    sender_uuid VARCHAR(80) NOT NULL,
    sender_name VARCHAR(180) NOT NULL,
    content LONGTEXT NOT NULL,
    sequence_number INT NOT NULL,
    client_message_id VARCHAR(80) NOT NULL,
    mention_ids_json LONGTEXT NOT NULL DEFAULT '[]',
    attachment_json LONGTEXT NOT NULL DEFAULT 'null',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_messaging_message_uuid (uuid),
    UNIQUE KEY uq_neot_messaging_sequence (conversation_uuid, sequence_number),
    UNIQUE KEY uq_neot_messaging_client (conversation_uuid, client_message_id),
    KEY idx_neot_messaging_message_created (conversation_uuid, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`ALTER TABLE neot_messaging_messages
    ADD COLUMN IF NOT EXISTS mention_ids_json LONGTEXT NOT NULL DEFAULT '[]' AFTER client_message_id`.execute(database);
  await sql`ALTER TABLE neot_messaging_messages
    ADD COLUMN IF NOT EXISTS attachment_json LONGTEXT NOT NULL DEFAULT 'null' AFTER mention_ids_json`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_messaging_reactions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    message_uuid CHAR(8) NOT NULL,
    user_uuid VARCHAR(80) NOT NULL,
    user_name VARCHAR(180) NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_messaging_reaction_user (message_uuid, user_uuid),
    KEY idx_neot_messaging_reaction_message (message_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return messagingMigration;
}
