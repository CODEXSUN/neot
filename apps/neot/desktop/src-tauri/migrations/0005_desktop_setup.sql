CREATE TABLE IF NOT EXISTS desktop_local_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL,
  email TEXT,
  remember_identity INTEGER NOT NULL DEFAULT 1 CHECK (remember_identity IN (0, 1)),
  confirm_on_startup INTEGER NOT NULL DEFAULT 0 CHECK (confirm_on_startup IN (0, 1)),
  last_workspace_path TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (5, 'local identity and workspace mapping');
