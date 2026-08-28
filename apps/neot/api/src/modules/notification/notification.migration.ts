import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const notificationMigration = {
  description: "Durable notification inbox and delivery queue.",
  key: "neot.notification.sql.v1"
} as const;

export async function migrateNotificationModule(database: Kysely<NEOTDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS neot_notifications (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL,
    actor_id VARCHAR(160) NOT NULL, recipient_actor_id VARCHAR(160) NOT NULL,
    recipient_email VARCHAR(240) NULL, category VARCHAR(80) NOT NULL,
    title VARCHAR(220) NOT NULL, body VARCHAR(1000) NOT NULL,
    action_url VARCHAR(500) NULL, status VARCHAR(24) NOT NULL DEFAULT 'unread',
    metadata_json TEXT NOT NULL DEFAULT ('{}'), read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_notifications_uuid (uuid),
    KEY idx_neot_notifications_recipient (recipient_actor_id, status, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_notification_jobs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL,
    notification_uuid CHAR(32) NOT NULL, channel VARCHAR(24) NOT NULL,
    queue_name VARCHAR(80) NOT NULL DEFAULT 'neot-notifications',
    backend VARCHAR(24) NOT NULL DEFAULT 'database', status VARCHAR(24) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0, max_attempts INT NOT NULL DEFAULT 5,
    available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, locked_at DATETIME NULL,
    completed_at DATETIME NULL, failed_at DATETIME NULL, last_error VARCHAR(1000) NOT NULL DEFAULT '',
    idempotency_key VARCHAR(220) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_notification_jobs_uuid (uuid),
    UNIQUE KEY uq_neot_notification_jobs_idempotency (idempotency_key),
    KEY idx_neot_notification_jobs_dispatch (status, available_at, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return notificationMigration;
}
