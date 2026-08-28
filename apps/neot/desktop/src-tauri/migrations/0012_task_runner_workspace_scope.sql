CREATE INDEX IF NOT EXISTS desktop_tasks_workspace_updated
  ON desktop_tasks (workspace_path, updated_at DESC);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (12, 'workspace-scoped local tasks');
