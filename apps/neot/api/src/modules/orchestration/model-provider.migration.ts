import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const modelProviderMigration = { key: "neot.orchestration-model-providers.v1" } as const;

export async function migrateModelProviders(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_model_provider_connections (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      provider VARCHAR(32) NOT NULL,
      label VARCHAR(120) NOT NULL,
      encrypted_api_key TEXT NULL,
      base_url VARCHAR(500) NOT NULL,
      model VARCHAR(160) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'configured',
      last_error TEXT NULL,
      last_tested_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_neot_model_provider_uuid (uuid),
      UNIQUE KEY uq_neot_model_provider_actor (actor_id, provider)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}
