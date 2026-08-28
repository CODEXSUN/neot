CREATE INDEX IF NOT EXISTS desktop_tasks_workspace_schedule
  ON desktop_tasks (workspace_path, scheduled_at);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (13, 'local task controls and scheduling');
