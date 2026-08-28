CREATE INDEX IF NOT EXISTS desktop_project_tasks_workspace_skill
  ON desktop_project_tasks (workspace_path, skill_path);

INSERT OR IGNORE INTO desktop_schema_migrations (version, description)
VALUES (15, 'project task skill binding');
