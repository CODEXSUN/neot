CREATE TABLE IF NOT EXISTS desktop_project_task_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_path TEXT NOT NULL,
  project_task_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS desktop_project_task_runs_task_created
  ON desktop_project_task_runs (workspace_path, project_task_id, created_at DESC);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (16, 'project task run history');
