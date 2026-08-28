CREATE TABLE IF NOT EXISTS desktop_project_details (
  workspace_path TEXT PRIMARY KEY,
  tagline TEXT,
  owner_name TEXT,
  started_on TEXT,
  due_on TEXT,
  project_type TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  project_id INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS desktop_project_details_position
  ON desktop_project_details (position, updated_at DESC);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (21, 'saved desktop project details');
