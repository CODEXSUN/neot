CREATE TABLE IF NOT EXISTS desktop_agent_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_path TEXT NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  access TEXT NOT NULL DEFAULT 'workspaceWrite',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS desktop_agent_tasks_workspace_updated
ON desktop_agent_tasks (workspace_path, updated_at DESC);

CREATE TABLE IF NOT EXISTS desktop_agent_messages (
  id TEXT PRIMARY KEY,
  task_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES desktop_agent_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS desktop_agent_messages_task_created
ON desktop_agent_messages (task_id, created_at);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (2, 'durable desktop agent tasks and messages');
