CREATE TABLE IF NOT EXISTS desktop_work_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS desktop_work_groups_default
  ON desktop_work_groups (is_default DESC, updated_at DESC);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (19, 'persisted local workspace folders');
