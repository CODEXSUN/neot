CREATE TABLE IF NOT EXISTS desktop_project_id_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_value INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO desktop_project_id_sequence (id, last_value)
VALUES (1, 0);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (22, 'automatic desktop project identifiers');
