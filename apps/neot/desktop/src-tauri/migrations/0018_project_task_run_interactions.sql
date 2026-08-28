CREATE INDEX IF NOT EXISTS desktop_project_task_runs_agent_task
  ON desktop_project_task_runs (agent_task_id);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (18, 'project task run interactions');
