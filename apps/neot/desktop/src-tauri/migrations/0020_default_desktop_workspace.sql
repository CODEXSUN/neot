CREATE TABLE IF NOT EXISTS desktop_default_workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  workspace_path TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (20, 'persisted default local project');
