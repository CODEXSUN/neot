import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const agentRunMigration = {
  description: "Durable Agent runs with connector, workspace, approval, and verification evidence.",
  key: "neot.agent-runs.sql.v2"
} as const;

export async function migrateAgentRuns(database: Kysely<NEOTDatabase>) {
  await createRuns(database);
  await createSteps(database);
  await createEvents(database);
  await createApprovals(database);
  await createArtifacts(database);
  await createToolCalls(database);
  await createVerifications(database);
  await createTaskGraph(database);
  return agentRunMigration;
}

async function createTaskGraph(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_tasks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      parent_run_uuid CHAR(16) NOT NULL,
      child_run_uuid CHAR(16) NULL,
      actor_id VARCHAR(160) NOT NULL,
      task_key VARCHAR(80) NOT NULL,
      sequence_no INT UNSIGNED NOT NULL,
      title VARCHAR(240) NOT NULL,
      objective TEXT NOT NULL,
      agent_profile VARCHAR(80) NOT NULL,
      scope_json LONGTEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'blocked',
      result_summary LONGTEXT NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_tasks_uuid (uuid),
      UNIQUE KEY uq_neot_agent_tasks_key (parent_run_uuid, task_key),
      KEY idx_neot_agent_tasks_parent (parent_run_uuid, sequence_no),
      CONSTRAINT fk_neot_agent_tasks_parent FOREIGN KEY (parent_run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE,
      CONSTRAINT fk_neot_agent_tasks_child FOREIGN KEY (child_run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_task_dependencies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      task_uuid CHAR(16) NOT NULL,
      depends_on_task_uuid CHAR(16) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_task_dependency (task_uuid, depends_on_task_uuid),
      CONSTRAINT fk_neot_agent_dependency_task FOREIGN KEY (task_uuid)
        REFERENCES neot_agent_tasks (uuid) ON DELETE CASCADE,
      CONSTRAINT fk_neot_agent_dependency_required FOREIGN KEY (depends_on_task_uuid)
        REFERENCES neot_agent_tasks (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_parent_reviews (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      parent_run_uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      decision VARCHAR(32) NOT NULL,
      note TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_parent_reviews_uuid (uuid),
      KEY idx_neot_agent_parent_reviews_run (parent_run_uuid, created_at),
      CONSTRAINT fk_neot_agent_parent_reviews_run FOREIGN KEY (parent_run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}

async function createRuns(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_runs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      project_uuid VARCHAR(160) NOT NULL,
      project_key VARCHAR(160) NOT NULL,
      project_title VARCHAR(240) NOT NULL,
      chat_thread_uuid CHAR(16) NOT NULL,
      codex_thread_id VARCHAR(240) NULL,
      codex_turn_id VARCHAR(240) NULL,
      connection_id VARCHAR(32) NOT NULL DEFAULT 'primary',
      agent_profile VARCHAR(80) NOT NULL,
      assist_mode VARCHAR(32) NOT NULL,
      access_mode VARCHAR(32) NOT NULL,
      model VARCHAR(80) NOT NULL,
      objective TEXT NOT NULL,
      status VARCHAR(32) NOT NULL,
      budget_json TEXT NOT NULL,
      result_summary LONGTEXT NULL,
      error_message TEXT NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      workspace_mode VARCHAR(24) NOT NULL DEFAULT 'source',
      workspace_status VARCHAR(24) NOT NULL DEFAULT 'source',
      source_root VARCHAR(1000) NULL,
      workspace_path VARCHAR(1000) NULL,
      branch_name VARCHAR(240) NULL,
      base_revision VARCHAR(80) NULL,
      workspace_cleaned_at DATETIME NULL,
      verification_status VARCHAR(24) NOT NULL DEFAULT 'not_run',
      verification_completed_at DATETIME NULL,
      verification_fingerprint CHAR(64) NULL,
      review_status VARCHAR(32) NOT NULL DEFAULT 'pending',
      commit_hash VARCHAR(80) NULL,
      committed_at DATETIME NULL,
      UNIQUE KEY uq_neot_agent_runs_uuid (uuid),
      KEY idx_neot_agent_runs_actor_project (actor_id, project_uuid, updated_at),
      CONSTRAINT fk_neot_agent_runs_chat
        FOREIGN KEY (chat_thread_uuid) REFERENCES neot_orchestration_chat_threads (uuid)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS workspace_mode VARCHAR(24) NOT NULL DEFAULT 'source' AFTER updated_at`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS connection_id VARCHAR(32) NOT NULL DEFAULT 'primary' AFTER codex_turn_id`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS workspace_status VARCHAR(24) NOT NULL DEFAULT 'source' AFTER workspace_mode`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS source_root VARCHAR(1000) NULL AFTER workspace_status`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS workspace_path VARCHAR(1000) NULL AFTER source_root`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS branch_name VARCHAR(240) NULL AFTER workspace_path`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS base_revision VARCHAR(80) NULL AFTER branch_name`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS workspace_cleaned_at DATETIME NULL AFTER base_revision`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(24) NOT NULL DEFAULT 'not_run' AFTER workspace_cleaned_at`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS verification_completed_at DATETIME NULL AFTER verification_status`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS verification_fingerprint CHAR(64) NULL AFTER verification_completed_at`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS review_status VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER verification_fingerprint`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS commit_hash VARCHAR(80) NULL AFTER review_status`.execute(
    database
  );
  await sql`ALTER TABLE neot_agent_runs ADD COLUMN IF NOT EXISTS committed_at DATETIME NULL AFTER commit_hash`.execute(
    database
  );
}

async function createSteps(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_run_steps (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      run_uuid CHAR(16) NOT NULL,
      sequence_no INT UNSIGNED NOT NULL,
      kind VARCHAR(80) NOT NULL,
      label VARCHAR(240) NOT NULL,
      status VARCHAR(32) NOT NULL,
      output_json LONGTEXT NOT NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_steps_uuid (uuid),
      KEY idx_neot_agent_steps_run (run_uuid, sequence_no),
      CONSTRAINT fk_neot_agent_steps_run FOREIGN KEY (run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}

async function createEvents(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      run_uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      event_type VARCHAR(120) NOT NULL,
      payload_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_events_uuid (uuid),
      KEY idx_neot_agent_events_run (run_uuid, created_at),
      CONSTRAINT fk_neot_agent_events_run FOREIGN KEY (run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}

async function createApprovals(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_approvals (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      run_uuid CHAR(16) NOT NULL,
      actor_id VARCHAR(160) NOT NULL,
      thread_id VARCHAR(240) NOT NULL,
      request_id INT UNSIGNED NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(24) NOT NULL,
      decision VARCHAR(32) NULL,
      decided_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_approvals_uuid (uuid),
      UNIQUE KEY uq_neot_agent_approvals_request (actor_id, thread_id, request_id),
      KEY idx_neot_agent_approvals_run (run_uuid, created_at),
      CONSTRAINT fk_neot_agent_approvals_run FOREIGN KEY (run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}

async function createArtifacts(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_artifacts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      run_uuid CHAR(16) NOT NULL,
      artifact_type VARCHAR(80) NOT NULL,
      label VARCHAR(240) NOT NULL,
      path VARCHAR(1000) NOT NULL,
      metadata_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_artifacts_uuid (uuid),
      UNIQUE KEY uq_neot_agent_artifacts_path (run_uuid, path(500)),
      CONSTRAINT fk_neot_agent_artifacts_run FOREIGN KEY (run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}

async function createToolCalls(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_tool_calls (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      run_uuid CHAR(16) NOT NULL,
      tool_name VARCHAR(160) NOT NULL,
      risk_level VARCHAR(24) NOT NULL,
      status VARCHAR(32) NOT NULL,
      input_json LONGTEXT NOT NULL,
      output_json LONGTEXT NOT NULL,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_tool_calls_uuid (uuid),
      KEY idx_neot_agent_tool_calls_run (run_uuid, created_at),
      CONSTRAINT fk_neot_agent_tool_calls_run FOREIGN KEY (run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}

async function createVerifications(database: Kysely<NEOTDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS neot_agent_verifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(16) NOT NULL,
      run_uuid CHAR(16) NOT NULL,
      attempt_no INT UNSIGNED NOT NULL,
      command_id VARCHAR(120) NOT NULL,
      label VARCHAR(240) NOT NULL,
      command_name VARCHAR(500) NOT NULL,
      args_json LONGTEXT NOT NULL,
      required_gate TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(24) NOT NULL,
      exit_code INT NULL,
      stdout_text LONGTEXT NOT NULL,
      stderr_text LONGTEXT NOT NULL,
      duration_ms INT UNSIGNED NOT NULL,
      completed_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_neot_agent_verifications_uuid (uuid),
      KEY idx_neot_agent_verifications_run (run_uuid, attempt_no, created_at),
      CONSTRAINT fk_neot_agent_verifications_run FOREIGN KEY (run_uuid)
        REFERENCES neot_agent_runs (uuid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
}
