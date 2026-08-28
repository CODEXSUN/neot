INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (10, 'isolated task runner records');

CREATE INDEX IF NOT EXISTS desktop_agent_tasks_runner_local
ON desktop_agent_tasks (workspace_path, local_task_id, updated_at DESC);
