CREATE TABLE IF NOT EXISTS desktop_saved_repository_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_group_path TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('application', 'plugin', 'document', 'other')),
  relationship TEXT NOT NULL CHECK (relationship IN ('project', 'addOn', 'standalone')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(work_group_path, url)
);

CREATE INDEX IF NOT EXISTS desktop_saved_repository_urls_work_group_idx
  ON desktop_saved_repository_urls (work_group_path, updated_at DESC);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (7, 'saved repository clone URLs');
