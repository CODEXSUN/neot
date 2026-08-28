CREATE TABLE IF NOT EXISTS desktop_project_learning_settings (
  workspace_path TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  auto_scan INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS desktop_project_learnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_path TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  evidence_path TEXT,
  source TEXT NOT NULL DEFAULT 'detected',
  status TEXT NOT NULL DEFAULT 'candidate',
  confidence INTEGER NOT NULL DEFAULT 100,
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_path, fingerprint)
);

CREATE INDEX IF NOT EXISTS desktop_project_learnings_workspace_status
ON desktop_project_learnings (workspace_path, status, updated_at DESC);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (3, 'reviewed project learning loop');
