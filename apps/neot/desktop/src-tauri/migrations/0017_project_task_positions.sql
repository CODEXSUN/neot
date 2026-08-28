UPDATE desktop_project_tasks
SET position = id
WHERE position = 0;

CREATE INDEX IF NOT EXISTS desktop_project_tasks_workspace_position
  ON desktop_project_tasks (workspace_path, position, id);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (17, 'project task positions');
