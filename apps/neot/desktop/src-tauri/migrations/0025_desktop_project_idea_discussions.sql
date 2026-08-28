CREATE TABLE IF NOT EXISTS desktop_project_idea_discussions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER NOT NULL,
    workspace_path TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS desktop_project_idea_discussions_idea_created
    ON desktop_project_idea_discussions (workspace_path, idea_id, created_at, id);
