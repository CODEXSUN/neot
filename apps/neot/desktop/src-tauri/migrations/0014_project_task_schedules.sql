CREATE TABLE IF NOT EXISTS desktop_project_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_path TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  schedule TEXT NOT NULL DEFAULT 'manual',
  agent_model TEXT NOT NULL DEFAULT 'gpt-5.6-terra',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS desktop_project_tasks_workspace_updated
  ON desktop_project_tasks (workspace_path, updated_at DESC);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (14, 'project-owned scheduled tasks');
