import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const agentPersonaMigration = {
  description: "Named supervisor and delegate profiles for Agent task graphs.",
  key: "neot.agent-personas.sql.v1"
} as const;

export async function migrateAgentPersonas(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_personas (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      name VARCHAR(80) NOT NULL,
      persona_key VARCHAR(80) NOT NULL,
      role VARCHAR(24) NOT NULL,
      agent_profile VARCHAR(80) NOT NULL,
      description VARCHAR(500) NOT NULL,
      instructions TEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_personas_uuid (uuid),
      UNIQUE KEY uq_neot_agent_personas_actor_key (actor_id, persona_key),
      KEY idx_neot_agent_personas_actor_role (actor_id, role, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS supervisor_persona_uuid CHAR(16) NULL AFTER agent_profile`.execute(database);
  await sql`ALTER TABLE neot_agent_tasks ADD COLUMN IF NOT EXISTS delegate_persona_uuid CHAR(16) NULL AFTER agent_profile`.execute(database);
  return agentPersonaMigration;
}
