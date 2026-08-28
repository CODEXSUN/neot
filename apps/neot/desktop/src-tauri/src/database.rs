use std::collections::HashMap;
use std::path::PathBuf;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::error::{DesktopError, DesktopResult};

mod learning;
#[cfg(test)]
mod learning_tests;

pub use learning::{
    DetectedLearning, ProjectLearning, ProjectLearningSettings, ProjectLearningSummary,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub enabled: bool,
    pub is_default: bool,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub reasoning_effort: Option<String>,
    pub temperature: Option<f64>,
    pub system_prompt: Option<String>,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            is_default: false,
            api_key: None,
            base_url: None,
            model: None,
            reasoning_effort: None,
            temperature: None,
            system_prompt: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub codex_path: Option<String>,
    pub default_access: String,
    pub auto_start: bool,
    pub approval_policy: String,
    pub sandbox_type: String,
    pub network_access: bool,
    pub max_turns: i64,
    pub idle_timeout: i64,
    pub default_provider: String,
    pub providers: HashMap<String, ProviderConfig>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        let mut providers = HashMap::new();
        providers.insert(
            "codex".into(),
            ProviderConfig {
                enabled: true,
                is_default: true,
                model: Some("gpt-5.6-terra".into()),
                reasoning_effort: Some("low".into()),
                ..Default::default()
            },
        );
        providers.insert("openrouter".into(), ProviderConfig::default());
        providers.insert("opencode".into(), ProviderConfig::default());
        providers.insert("claude".into(), ProviderConfig::default());
        providers.insert(
            "gemini".into(),
            ProviderConfig {
                enabled: false,
                base_url: Some("https://generativelanguage.googleapis.com/v1beta".into()),
                model: Some("gemini-2.0-flash".into()),
                ..Default::default()
            },
        );
        providers.insert(
            "ollama".into(),
            ProviderConfig {
                enabled: true,
                base_url: Some("http://localhost:11434".into()),
                ..Default::default()
            },
        );
        Self {
            codex_path: None,
            default_access: "workspaceWrite".into(),
            auto_start: false,
            approval_policy: "on-request".into(),
            sandbox_type: "workspace-write".into(),
            network_access: false,
            max_turns: 50,
            idle_timeout: 180,
            default_provider: "codex".into(),
            providers,
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTask {
    pub archived: bool,
    pub execution_path: Option<String>,
    pub id: i64,
    pub review_requested: bool,
    pub run_status: String,
    pub thread_id: String,
    pub title: String,
    pub access: String,
    pub updated_at: String,
    pub worktree_branch: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentMessage {
    pub id: String,
    pub task_id: i64,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalTask {
    pub execution: String,
    pub id: i64,
    pub scheduled_at: Option<String>,
    pub title: String,
    pub status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTask {
    pub agent_model: String,
    pub id: i64,
    pub instructions: String,
    pub position: i64,
    pub schedule: String,
    pub skill_path: Option<String>,
    pub status: String,
    pub title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTaskRun {
    pub agent_task_id: Option<i64>,
    pub created_at: String,
    pub id: i64,
    pub project_task_id: i64,
    pub status: String,
    pub summary: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdea {
    pub id: i64,
    pub workspace_path: String,
    pub title: String,
    pub context: String,
    pub discussion: String,
    pub status: String,
    pub converted_task_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    pub discussion_count: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdeaDiscussion {
    pub id: i64,
    pub idea_id: i64,
    pub content: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProfile {
    pub display_name: String,
    pub email: Option<String>,
    pub remember_identity: bool,
    pub confirm_on_startup: bool,
    pub default_work_group_path: Option<String>,
    pub last_workspace_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWorkspace {
    pub path: String,
    pub name: String,
    pub kind: String,
    pub relationship: String,
    pub project_name: Option<String>,
    pub tagline: Option<String>,
    pub changelog_path: Option<String>,
    pub owner_name: Option<String>,
    pub started_on: Option<String>,
    pub due_on: Option<String>,
    pub project_type: Option<String>,
    pub priority: String,
    pub project_id: Option<i64>,
    pub pinned: bool,
    pub last_opened_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWorkGroup {
    pub path: String,
    pub name: String,
    pub is_default: bool,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedRepositoryUrl {
    pub id: i64,
    pub work_group_path: String,
    pub url: String,
    pub kind: String,
    pub relationship: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSetup {
    pub default_workspace_path: Option<String>,
    pub profile: Option<DesktopProfile>,
    pub work_groups: Vec<DesktopWorkGroup>,
    pub workspaces: Vec<DesktopWorkspace>,
}

pub struct DesktopDatabase {
    connection: Connection,
}

impl DesktopDatabase {
    pub fn open(path: PathBuf) -> DesktopResult<Self> {
        let database = Self {
            connection: Connection::open(path)?,
        };
        database.migrate()?;
        Ok(database)
    }

    pub fn list_local_tasks(&self, workspace_path: &str) -> DesktopResult<Vec<LocalTask>> {
        let mut statement = self.connection.prepare(
            "SELECT id, title, COALESCE(execution, title), status, scheduled_at FROM desktop_tasks WHERE workspace_path = ?1 OR workspace_path IS NULL ORDER BY updated_at DESC, id DESC",
        )?;
        let rows = statement.query_map(params![workspace_path], |row| {
            Ok(LocalTask { id: row.get(0)?, title: row.get(1)?, execution: row.get(2)?, status: row.get(3)?, scheduled_at: row.get(4)? })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn save_local_task(&self, workspace_path: &str, title: &str, execution: &str) -> DesktopResult<LocalTask> {
        self.connection.execute(
            "INSERT INTO desktop_tasks (workspace_path, title, execution) VALUES (?1, ?2, ?3)",
            params![workspace_path, title, execution],
        )?;
        let id = self.connection.last_insert_rowid();
        self.connection.query_row(
            "SELECT id, title, COALESCE(execution, title), status, scheduled_at FROM desktop_tasks WHERE id = ?1",
            params![id],
            |row| Ok(LocalTask { id: row.get(0)?, title: row.get(1)?, execution: row.get(2)?, status: row.get(3)?, scheduled_at: row.get(4)? }),
        ).map_err(Into::into)
    }

    pub fn set_local_task_status(&self, task_id: i64, status: &str) -> DesktopResult<LocalTask> {
        self.connection.execute(
            "UPDATE desktop_tasks SET status = ?1, scheduled_at = CASE WHEN ?1 = 'scheduled' THEN scheduled_at ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![status, task_id],
        )?;
        self.connection.query_row(
            "SELECT id, title, COALESCE(execution, title), status, scheduled_at FROM desktop_tasks WHERE id = ?1",
            params![task_id],
            |row| Ok(LocalTask { id: row.get(0)?, title: row.get(1)?, execution: row.get(2)?, status: row.get(3)?, scheduled_at: row.get(4)? }),
        ).map_err(Into::into)
    }

    pub fn update_local_task(&self, workspace_path: &str, task_id: i64, title: &str, execution: &str, status: &str, scheduled_at: Option<&str>) -> DesktopResult<LocalTask> {
        self.connection.execute(
            "UPDATE desktop_tasks SET title = ?1, execution = ?2, status = ?3, scheduled_at = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5 AND (workspace_path = ?6 OR workspace_path IS NULL)",
            params![title, execution, status, scheduled_at, task_id, workspace_path],
        )?;
        self.connection.query_row(
            "SELECT id, title, COALESCE(execution, title), status, scheduled_at FROM desktop_tasks WHERE id = ?1 AND (workspace_path = ?2 OR workspace_path IS NULL)",
            params![task_id, workspace_path],
            |row| Ok(LocalTask { id: row.get(0)?, title: row.get(1)?, execution: row.get(2)?, status: row.get(3)?, scheduled_at: row.get(4)? }),
        ).map_err(Into::into)
    }

    pub fn force_delete_local_task(&mut self, workspace_path: &str, task_id: i64) -> DesktopResult<bool> {
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "DELETE FROM desktop_agent_messages WHERE task_id IN (SELECT id FROM desktop_agent_tasks WHERE workspace_path = ?1 AND local_task_id = ?2)",
            params![workspace_path, task_id],
        )?;
        transaction.execute(
            "DELETE FROM desktop_agent_tasks WHERE workspace_path = ?1 AND local_task_id = ?2",
            params![workspace_path, task_id],
        )?;
        let deleted = transaction.execute(
            "DELETE FROM desktop_tasks WHERE id = ?1 AND (workspace_path = ?2 OR workspace_path IS NULL)",
            params![task_id, workspace_path],
        )?;
        transaction.commit()?;
        Ok(deleted > 0)
    }

    pub fn list_project_tasks(&self, workspace_path: &str) -> DesktopResult<Vec<ProjectTask>> {
        let mut statement = self.connection.prepare(
            "SELECT id, title, instructions, position, schedule, agent_model, status, skill_path FROM desktop_project_tasks WHERE workspace_path = ?1 ORDER BY position, id",
        )?;
        let rows = statement.query_map(params![workspace_path], project_task_from_row)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn save_project_task(&self, workspace_path: &str, title: &str, instructions: &str, schedule: &str, agent_model: &str, skill_path: Option<&str>) -> DesktopResult<ProjectTask> {
        self.connection.execute(
            "INSERT INTO desktop_project_tasks (workspace_path, title, instructions, schedule, agent_model, skill_path, position) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![workspace_path, title, instructions, schedule, agent_model, skill_path, self.next_project_task_position(workspace_path)?],
        )?;
        self.project_task(self.connection.last_insert_rowid(), workspace_path)
    }

    pub fn list_project_ideas(&self, workspace_path: &str) -> DesktopResult<Vec<ProjectIdea>> {
        let mut statement = self.connection.prepare("SELECT i.id, i.workspace_path, i.title, i.context, i.discussion, i.status, i.converted_task_id, i.created_at, i.updated_at, (SELECT COUNT(*) FROM desktop_project_idea_discussions d WHERE d.idea_id = i.id) FROM desktop_project_ideas i WHERE i.workspace_path = ?1 ORDER BY i.updated_at DESC, i.id DESC")?;
        let ideas = statement.query_map(params![workspace_path], project_idea_from_row)?.collect::<Result<Vec<_>, _>>()?;
        Ok(ideas)
    }

    pub fn save_project_idea(&self, workspace_path: &str, title: &str, context: &str, discussion: &str) -> DesktopResult<ProjectIdea> {
        self.workspace_by_path(workspace_path)?;
        self.connection.execute("INSERT INTO desktop_project_ideas (workspace_path, title, context, discussion) VALUES (?1, ?2, ?3, ?4)", params![workspace_path, title, context, discussion])?;
        self.project_idea(self.connection.last_insert_rowid(), workspace_path)
    }

    pub fn convert_project_idea(&self, workspace_path: &str, idea_id: i64) -> DesktopResult<ProjectIdea> {
        let idea = self.project_idea(idea_id, workspace_path)?;
        if idea.converted_task_id.is_some() { return Err(DesktopError::Policy("This idea is already linked to a project task.".into())); }
        let instructions = format!("Idea context:\n{}\n\nDiscussion notes:\n{}", idea.context, idea.discussion);
        let task = self.save_project_task(workspace_path, &idea.title, &instructions, "manual", "codex:gpt-5.6-terra", None)?;
        self.connection.execute("UPDATE desktop_project_ideas SET status = 'converted', converted_task_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND workspace_path = ?3", params![task.id, idea_id, workspace_path])?;
        self.project_idea(idea_id, workspace_path)
    }

    pub fn list_project_idea_discussions(&self, workspace_path: &str, idea_id: i64) -> DesktopResult<Vec<ProjectIdeaDiscussion>> {
        self.project_idea(idea_id, workspace_path)?;
        let mut statement = self.connection.prepare("SELECT id, idea_id, content, created_at FROM desktop_project_idea_discussions WHERE workspace_path = ?1 AND idea_id = ?2 ORDER BY created_at, id")?;
        let items = statement.query_map(params![workspace_path, idea_id], |row| Ok(ProjectIdeaDiscussion { id: row.get(0)?, idea_id: row.get(1)?, content: row.get(2)?, created_at: row.get(3)? }))?.collect::<Result<Vec<_>, _>>()?;
        Ok(items)
    }

    pub fn save_project_idea_discussion(&self, workspace_path: &str, idea_id: i64, content: &str) -> DesktopResult<ProjectIdeaDiscussion> {
        self.project_idea(idea_id, workspace_path)?;
        self.connection.execute("INSERT INTO desktop_project_idea_discussions (idea_id, workspace_path, content) VALUES (?1, ?2, ?3)", params![idea_id, workspace_path, content])?;
        self.connection.execute("UPDATE desktop_project_ideas SET discussion = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND workspace_path = ?3", params![content, idea_id, workspace_path])?;
        let id = self.connection.last_insert_rowid();
        self.connection.query_row("SELECT id, idea_id, content, created_at FROM desktop_project_idea_discussions WHERE id = ?1", params![id], |row| Ok(ProjectIdeaDiscussion { id: row.get(0)?, idea_id: row.get(1)?, content: row.get(2)?, created_at: row.get(3)? })).map_err(Into::into)
    }

    fn project_idea(&self, idea_id: i64, workspace_path: &str) -> DesktopResult<ProjectIdea> {
        self.connection.query_row(
            "SELECT i.id, i.workspace_path, i.title, i.context, i.discussion, i.status, i.converted_task_id, i.created_at, i.updated_at, (SELECT COUNT(*) FROM desktop_project_idea_discussions d WHERE d.idea_id = i.id) FROM desktop_project_ideas i WHERE i.id = ?1 AND i.workspace_path = ?2",
            params![idea_id, workspace_path],
            project_idea_from_row,
        ).map_err(Into::into)
    }

    pub fn update_project_task(&self, workspace_path: &str, task_id: i64, title: &str, instructions: &str, schedule: &str, agent_model: &str, skill_path: Option<&str>, status: &str) -> DesktopResult<ProjectTask> {
        self.connection.execute(
            "UPDATE desktop_project_tasks SET title = ?1, instructions = ?2, schedule = ?3, agent_model = ?4, skill_path = ?5, status = ?6, updated_at = CURRENT_TIMESTAMP WHERE id = ?7 AND workspace_path = ?8",
            params![title, instructions, schedule, agent_model, skill_path, status, task_id, workspace_path],
        )?;
        self.project_task(task_id, workspace_path)
    }

    pub fn delete_project_task(&self, workspace_path: &str, task_id: i64) -> DesktopResult<bool> {
        self.connection.execute(
            "DELETE FROM desktop_project_task_runs WHERE workspace_path = ?1 AND project_task_id = ?2",
            params![workspace_path, task_id],
        )?;
        let deleted = self.connection.execute(
            "DELETE FROM desktop_project_tasks WHERE id = ?1 AND workspace_path = ?2",
            params![task_id, workspace_path],
        )?;
        Ok(deleted > 0)
    }

    pub fn copy_project_task_to_workspace(
        &self,
        source_workspace_path: &str,
        task_id: i64,
        destination_workspace_path: &str,
    ) -> DesktopResult<ProjectTask> {
        if source_workspace_path == destination_workspace_path {
            return Err(DesktopError::Policy(
                "Choose a different project to copy this task.".into(),
            ));
        }
        let task = self.project_task(task_id, source_workspace_path)?;
        self.workspace_by_path(destination_workspace_path)?;
        self.connection.execute(
            "INSERT INTO desktop_project_tasks (workspace_path, title, instructions, schedule, agent_model, skill_path, status, position) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![destination_workspace_path, task.title, task.instructions, task.schedule, task.agent_model, task.skill_path, task.status, self.next_project_task_position(destination_workspace_path)?],
        )?;
        self.project_task(self.connection.last_insert_rowid(), destination_workspace_path)
    }

    pub fn move_project_task(&self, workspace_path: &str, task_id: i64, direction: &str) -> DesktopResult<Vec<ProjectTask>> {
        let task = self.project_task(task_id, workspace_path)?;
        let operator = if direction == "up" { "<" } else { ">" };
        let order = if direction == "up" { "DESC" } else { "ASC" };
        let sql = format!("SELECT id, position FROM desktop_project_tasks WHERE workspace_path = ?1 AND position {operator} ?2 ORDER BY position {order}, id {order} LIMIT 1");
        let adjacent = self.connection.query_row(&sql, params![workspace_path, task.position], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))).ok();
        if let Some((adjacent_id, adjacent_position)) = adjacent {
            self.connection.execute("UPDATE desktop_project_tasks SET position = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND workspace_path = ?3", params![adjacent_position, task.id, workspace_path])?;
            self.connection.execute("UPDATE desktop_project_tasks SET position = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND workspace_path = ?3", params![task.position, adjacent_id, workspace_path])?;
        }
        self.list_project_tasks(workspace_path)
    }

    pub fn queue_project_task_run(&self, workspace_path: &str, task_id: i64) -> DesktopResult<ProjectTaskRun> {
        self.project_task(task_id, workspace_path)?;
        let status = "requested";
        let summary = "Run requested. The selected provider will start in this task's isolated worktree.";
        self.connection.execute(
            "INSERT INTO desktop_project_task_runs (workspace_path, project_task_id, status, summary) VALUES (?1, ?2, ?3, ?4)",
            params![workspace_path, task_id, status, summary],
        )?;
        self.project_task_run(self.connection.last_insert_rowid(), workspace_path)
    }

    pub fn list_project_task_runs(&self, workspace_path: &str, task_id: i64) -> DesktopResult<Vec<ProjectTaskRun>> {
        self.project_task(task_id, workspace_path)?;
        let mut statement = self.connection.prepare(
            "SELECT id, project_task_id, agent_task_id, status, summary, created_at FROM desktop_project_task_runs WHERE workspace_path = ?1 AND project_task_id = ?2 ORDER BY created_at DESC, id DESC",
        )?;
        let rows = statement.query_map(params![workspace_path, task_id], project_task_run_from_row)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn update_project_task_run(&self, workspace_path: &str, run_id: i64, status: &str, summary: &str) -> DesktopResult<ProjectTaskRun> {
        self.connection.execute(
            "UPDATE desktop_project_task_runs SET status = ?1, summary = ?2 WHERE id = ?3 AND workspace_path = ?4",
            params![status, summary, run_id, workspace_path],
        )?;
        self.project_task_run(run_id, workspace_path)
    }

    pub fn bind_project_task_run_agent_task(&self, workspace_path: &str, run_id: i64, agent_task_id: i64) -> DesktopResult<ProjectTaskRun> {
        self.connection.execute(
            "UPDATE desktop_project_task_runs SET agent_task_id = ?1 WHERE id = ?2 AND workspace_path = ?3",
            params![agent_task_id, run_id, workspace_path],
        )?;
        self.project_task_run(run_id, workspace_path)
    }

    pub fn delete_project_task_run(&self, workspace_path: &str, run_id: i64) -> DesktopResult<bool> {
        let deleted = self.connection.execute(
            "DELETE FROM desktop_project_task_runs WHERE id = ?1 AND workspace_path = ?2",
            params![run_id, workspace_path],
        )?;
        Ok(deleted > 0)
    }

    fn project_task(&self, task_id: i64, workspace_path: &str) -> DesktopResult<ProjectTask> {
        self.connection.query_row(
            "SELECT id, title, instructions, position, schedule, agent_model, status, skill_path FROM desktop_project_tasks WHERE id = ?1 AND workspace_path = ?2",
            params![task_id, workspace_path],
            project_task_from_row,
        ).map_err(Into::into)
    }

    fn next_project_task_position(&self, workspace_path: &str) -> DesktopResult<i64> {
        Ok(self.connection.query_row("SELECT COALESCE(MAX(position), 0) + 1 FROM desktop_project_tasks WHERE workspace_path = ?1", params![workspace_path], |row| row.get(0))?)
    }

    fn project_task_run(&self, run_id: i64, workspace_path: &str) -> DesktopResult<ProjectTaskRun> {
        self.connection.query_row(
            "SELECT id, project_task_id, agent_task_id, status, summary, created_at FROM desktop_project_task_runs WHERE id = ?1 AND workspace_path = ?2",
            params![run_id, workspace_path],
            project_task_run_from_row,
        ).map_err(Into::into)
    }

    pub fn list_agent_tasks(&self, workspace_path: &str) -> DesktopResult<Vec<AgentTask>> {
        let mut statement = self.connection.prepare(
            "SELECT id, thread_id, title, access, archived, review_requested, updated_at, execution_path, worktree_branch, run_status
             FROM desktop_agent_tasks
             WHERE workspace_path = ?1 AND archived = 0 AND surface = 'chat'
             ORDER BY updated_at DESC, id DESC",
        )?;
        let rows = statement.query_map(params![workspace_path], agent_task_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn get_agent_task(&self, workspace_path: &str, task_id: i64) -> DesktopResult<AgentTask> {
        self.agent_task(workspace_path, task_id)
    }

    pub fn save_agent_task(
        &self,
        workspace_path: &str,
        thread_id: &str,
        title: &str,
        access: &str,
        surface: &str,
        local_task_id: Option<i64>,
    ) -> DesktopResult<AgentTask> {
        self.connection.execute(
            "INSERT INTO desktop_agent_tasks (workspace_path, thread_id, title, access, surface, local_task_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(thread_id) DO UPDATE SET
               title = excluded.title,
               access = excluded.access,
               surface = excluded.surface,
               local_task_id = excluded.local_task_id,
               archived = 0,
               updated_at = CURRENT_TIMESTAMP",
            params![workspace_path, thread_id, title, access, surface, local_task_id],
        )?;
        Ok(self.connection.query_row(
            "SELECT id, thread_id, title, access, archived, review_requested, updated_at, execution_path, worktree_branch, run_status
             FROM desktop_agent_tasks WHERE thread_id = ?1",
            params![thread_id],
            agent_task_from_row,
        )?)
    }

    pub fn runner_task(&self, workspace_path: &str, local_task_id: i64) -> DesktopResult<Option<AgentTask>> {
        let mut statement = self.connection.prepare(
            "SELECT id, thread_id, title, access, archived, review_requested, updated_at, execution_path, worktree_branch, run_status
             FROM desktop_agent_tasks WHERE workspace_path = ?1 AND surface = 'runner' AND local_task_id = ?2
             ORDER BY updated_at DESC, id DESC LIMIT 1",
        )?;
        let mut rows = statement.query(params![workspace_path, local_task_id])?;
        rows.next()?.map(agent_task_from_row).transpose().map_err(Into::into)
    }

    pub fn set_agent_task_execution(
        &self,
        workspace_path: &str,
        task_id: i64,
        execution_path: &str,
        worktree_branch: &str,
    ) -> DesktopResult<AgentTask> {
        self.connection.execute(
            "UPDATE desktop_agent_tasks
             SET execution_path = ?1, worktree_branch = ?2, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?3 AND workspace_path = ?4",
            params![execution_path, worktree_branch, task_id, workspace_path],
        )?;
        self.agent_task(workspace_path, task_id)
    }

    pub fn set_agent_task_status(
        &self,
        workspace_path: &str,
        task_id: i64,
        run_status: &str,
    ) -> DesktopResult<AgentTask> {
        self.connection.execute(
            "UPDATE desktop_agent_tasks SET run_status = ?1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2 AND workspace_path = ?3",
            params![run_status, task_id, workspace_path],
        )?;
        self.agent_task(workspace_path, task_id)
    }

    pub fn agent_task_execution_path(
        &self,
        workspace_path: &str,
        task_id: i64,
    ) -> DesktopResult<String> {
        self.connection
            .query_row(
                "SELECT COALESCE(execution_path, workspace_path) FROM desktop_agent_tasks
             WHERE id = ?1 AND workspace_path = ?2",
                params![task_id, workspace_path],
                |row| row.get(0),
            )
            .map_err(Into::into)
    }

    fn agent_task(&self, workspace_path: &str, task_id: i64) -> DesktopResult<AgentTask> {
        self.connection.query_row(
            "SELECT id, thread_id, title, access, archived, review_requested, updated_at, execution_path, worktree_branch, run_status
             FROM desktop_agent_tasks WHERE id = ?1 AND workspace_path = ?2",
            params![task_id, workspace_path],
            agent_task_from_row,
        ).map_err(Into::into)
    }

    pub fn list_agent_messages(&self, task_id: i64) -> DesktopResult<Vec<AgentMessage>> {
        let mut statement = self.connection.prepare(
            "SELECT id, task_id, role, content, created_at
             FROM desktop_agent_messages
             WHERE task_id = ?1
             ORDER BY created_at, rowid",
        )?;
        let rows = statement.query_map(params![task_id], |row| {
            Ok(AgentMessage {
                id: row.get(0)?,
                task_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn save_agent_message(
        &mut self,
        task_id: i64,
        id: &str,
        role: &str,
        content: &str,
    ) -> DesktopResult<AgentMessage> {
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "INSERT INTO desktop_agent_messages (id, task_id, role, content)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET content = excluded.content",
            params![id, task_id, role, content],
        )?;
        transaction.execute(
            "UPDATE desktop_agent_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![task_id],
        )?;
        let message = transaction.query_row(
            "SELECT id, task_id, role, content, created_at
             FROM desktop_agent_messages WHERE id = ?1",
            params![id],
            |row| {
                Ok(AgentMessage {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )?;
        transaction.commit()?;
        Ok(message)
    }

    pub fn delete_agent_message(&self, task_id: i64, id: &str) -> DesktopResult<bool> {
        let deleted = self.connection.execute(
            "DELETE FROM desktop_agent_messages WHERE task_id = ?1 AND id = ?2",
            params![task_id, id],
        )?;
        Ok(deleted > 0)
    }

    pub fn archive_agent_task(&self, workspace_path: &str, task_id: i64) -> DesktopResult<bool> {
        let updated = self.connection.execute(
            "UPDATE desktop_agent_tasks
             SET archived = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1 AND workspace_path = ?2",
            params![task_id, workspace_path],
        )?;
        Ok(updated > 0)
    }

    pub fn rename_agent_task(
        &self,
        workspace_path: &str,
        task_id: i64,
        title: &str,
    ) -> DesktopResult<AgentTask> {
        self.connection.execute(
            "UPDATE desktop_agent_tasks
             SET title = ?1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2 AND workspace_path = ?3",
            params![title, task_id, workspace_path],
        )?;
        self.agent_task(workspace_path, task_id)
    }

    pub fn delete_agent_task(&mut self, workspace_path: &str, task_id: i64) -> DesktopResult<bool> {
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "DELETE FROM desktop_agent_messages
             WHERE task_id IN (SELECT id FROM desktop_agent_tasks WHERE id = ?1 AND workspace_path = ?2)",
            params![task_id, workspace_path],
        )?;
        let deleted = transaction.execute(
            "DELETE FROM desktop_agent_tasks WHERE id = ?1 AND workspace_path = ?2",
            params![task_id, workspace_path],
        )?;
        transaction.commit()?;
        Ok(deleted > 0)
    }

    pub fn request_agent_task_review(
        &self,
        workspace_path: &str,
        task_id: i64,
    ) -> DesktopResult<AgentTask> {
        self.connection.execute(
            "UPDATE desktop_agent_tasks
             SET review_requested = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1 AND workspace_path = ?2",
            params![task_id, workspace_path],
        )?;
        self.connection.query_row(
            "SELECT id, thread_id, title, access, archived, review_requested, updated_at, execution_path, worktree_branch, run_status
             FROM desktop_agent_tasks WHERE id = ?1 AND workspace_path = ?2",
            params![task_id, workspace_path],
            agent_task_from_row,
        ).map_err(Into::into)
    }

    pub fn pending_sync_count(&self) -> DesktopResult<usize> {
        let count = self.connection.query_row(
            "SELECT COUNT(*) FROM desktop_sync_outbox WHERE status='pending'",
            [],
            |row| row.get::<_, i64>(0),
        )?;
        Ok(count as usize)
    }

    pub fn desktop_setup(&self) -> DesktopResult<DesktopSetup> {
        Ok(DesktopSetup {
            default_workspace_path: self.default_workspace_path()?,
            profile: self.desktop_profile()?,
            work_groups: self.list_desktop_work_groups()?,
            workspaces: self.list_desktop_workspaces()?,
        })
    }

    pub fn save_desktop_profile(&self, profile: &DesktopProfile) -> DesktopResult<DesktopProfile> {
        self.connection.execute(
            "INSERT INTO desktop_local_profile (id, display_name, email, remember_identity, confirm_on_startup, default_work_group_path, last_workspace_path)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email,
             remember_identity = excluded.remember_identity, confirm_on_startup = excluded.confirm_on_startup,
             default_work_group_path = excluded.default_work_group_path,
             last_workspace_path = excluded.last_workspace_path, updated_at = CURRENT_TIMESTAMP",
            params![profile.display_name, profile.email, profile.remember_identity, profile.confirm_on_startup, profile.default_work_group_path, profile.last_workspace_path],
        )?;
        self.desktop_profile()?
            .ok_or_else(|| DesktopError::Policy("Local profile was not saved.".into()))
    }

    pub fn save_default_work_group(&self, path: &str) -> DesktopResult<DesktopProfile> {
        let name = std::path::Path::new(path)
            .file_name()
            .and_then(|value| value.to_str())
            .filter(|value| !value.is_empty())
            .unwrap_or("Workspace");
        let transaction = self.connection.unchecked_transaction()?;
        transaction.execute("UPDATE desktop_work_groups SET is_default = 0", [])?;
        transaction.execute(
            "INSERT INTO desktop_work_groups (path, name, is_default) VALUES (?1, ?2, 1)
             ON CONFLICT(path) DO UPDATE SET name = excluded.name, is_default = 1, updated_at = CURRENT_TIMESTAMP",
            params![path, name],
        )?;
        let updated = transaction.execute(
            "UPDATE desktop_local_profile SET default_work_group_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
            params![path],
        )?;
        if updated == 0 {
            transaction.rollback()?;
            return Err(DesktopError::Policy(
                "Save a local identity before selecting a work group.".into(),
            ));
        }
        transaction.commit()?;
        self.desktop_profile()?
            .ok_or_else(|| DesktopError::Policy("Work group was not saved.".into()))
    }

    pub fn reset_default_work_group(&self) -> DesktopResult<DesktopProfile> {
        let updated = self.connection.execute(
            "UPDATE desktop_local_profile
             SET default_work_group_path = NULL, last_workspace_path = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = 1",
            [],
        )?;
        if updated == 0 {
            return Err(DesktopError::Policy(
                "Save a local identity before resetting a work group.".into(),
            ));
        }
        self.desktop_profile()?
            .ok_or_else(|| DesktopError::Policy("Work group was not reset.".into()))
    }

    pub fn save_desktop_workspace(
        &self,
        workspace: &DesktopWorkspace,
    ) -> DesktopResult<DesktopWorkspace> {
        self.connection.execute(
            "INSERT INTO desktop_workspaces (path, name, kind, relationship, project_name)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(path) DO UPDATE SET name = excluded.name, kind = excluded.kind,
             relationship = excluded.relationship, project_name = excluded.project_name, updated_at = CURRENT_TIMESTAMP",
            params![workspace.path, workspace.name, workspace.kind, workspace.relationship, workspace.project_name],
        )?;
        self.ensure_project_detail_number(&workspace.path)?;
        self.workspace_by_path(&workspace.path)
    }

    pub fn set_desktop_workspace_pinned(
        &self,
        path: &str,
        pinned: bool,
    ) -> DesktopResult<DesktopWorkspace> {
        self.connection.execute(
            "UPDATE desktop_workspaces SET pinned = ?2, updated_at = CURRENT_TIMESTAMP WHERE path = ?1",
            params![path, pinned],
        )?;
        self.workspace_by_path(path)
    }

    pub fn save_desktop_project_details(
        &self,
        workspace: &DesktopWorkspace,
    ) -> DesktopResult<DesktopWorkspace> {
        self.workspace_by_path(&workspace.path)?;
        self.connection.execute(
            "INSERT INTO desktop_project_details (
                workspace_path, tagline, changelog_path, owner_name, started_on, due_on, project_type, priority, project_id, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)
             ON CONFLICT(workspace_path) DO UPDATE SET
                tagline = excluded.tagline,
                changelog_path = excluded.changelog_path,
                owner_name = excluded.owner_name,
                started_on = excluded.started_on,
                due_on = excluded.due_on,
                project_type = excluded.project_type,
                priority = excluded.priority,
                updated_at = CURRENT_TIMESTAMP",
            params![
                workspace.path,
                workspace.tagline,
                workspace.changelog_path,
                workspace.owner_name,
                workspace.started_on,
                workspace.due_on,
                workspace.project_type,
                workspace.priority,
                workspace.project_id,
            ],
        )?;
        self.workspace_by_path(&workspace.path)
    }

    pub fn set_default_desktop_workspace(&mut self, path: &str) -> DesktopResult<String> {
        self.workspace_by_path(path)?;
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "INSERT INTO desktop_default_workspace (id, workspace_path, updated_at) VALUES (1, ?1, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET workspace_path = excluded.workspace_path, updated_at = CURRENT_TIMESTAMP",
            params![path],
        )?;
        transaction.commit()?;
        Ok(path.into())
    }

    pub fn clear_default_desktop_workspace(&self) -> DesktopResult<()> {
        self.connection
            .execute("DELETE FROM desktop_default_workspace WHERE id = 1", [])?;
        Ok(())
    }

    pub fn remove_desktop_workspace(&self, path: &str) -> DesktopResult<bool> {
        self.connection.execute(
            "DELETE FROM desktop_default_workspace WHERE workspace_path = ?1",
            params![path],
        )?;
        let removed = self.connection.execute(
            "DELETE FROM desktop_workspaces WHERE path = ?1",
            params![path],
        )? > 0;
        self.connection.execute(
            "UPDATE desktop_local_profile SET last_workspace_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE last_workspace_path = ?1",
            params![path],
        )?;
        Ok(removed)
    }

    pub fn save_repository_url(
        &self,
        work_group_path: &str,
        url: &str,
        kind: &str,
        relationship: &str,
    ) -> DesktopResult<SavedRepositoryUrl> {
        self.connection.execute(
            "INSERT INTO desktop_saved_repository_urls (work_group_path, url, kind, relationship)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(work_group_path, url) DO UPDATE SET kind = excluded.kind,
             relationship = excluded.relationship, updated_at = CURRENT_TIMESTAMP",
            params![work_group_path, url, kind, relationship],
        )?;
        self.saved_repository_url(work_group_path, url)
    }

    pub fn list_repository_urls(
        &self,
        work_group_path: &str,
    ) -> DesktopResult<Vec<SavedRepositoryUrl>> {
        let mut statement = self.connection.prepare(
            "SELECT id, work_group_path, url, kind, relationship, updated_at
             FROM desktop_saved_repository_urls WHERE work_group_path = ?1
             ORDER BY updated_at DESC, id DESC",
        )?;
        let rows = statement.query_map(params![work_group_path], saved_repository_url_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn mark_workspace_opened(&self, path: &str, name: &str) -> DesktopResult<()> {
        self.connection.execute(
            "INSERT INTO desktop_workspaces (path, name) VALUES (?1, ?2)
             ON CONFLICT(path) DO UPDATE SET name = excluded.name, last_opened_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP",
            params![path, name],
        )?;
        self.connection.execute(
            "UPDATE desktop_local_profile SET last_workspace_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
            params![path],
        )?;
        Ok(())
    }

    pub fn get_agent_config(&self) -> DesktopResult<AgentConfig> {
        let mut statement = self
            .connection
            .prepare("SELECT key, value FROM desktop_settings WHERE key LIKE 'agent.%'")?;
        let rows = statement.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        let mut config = AgentConfig::default();
        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "agent.codex_path" => {
                    config.codex_path = if value.is_empty() { None } else { Some(value) }
                }
                "agent.default_access" => config.default_access = value,
                "agent.auto_start" => config.auto_start = value == "true",
                "agent.approval_policy" => config.approval_policy = value,
                "agent.sandbox_type" => config.sandbox_type = value,
                "agent.network_access" => config.network_access = value == "true",
                "agent.max_turns" => config.max_turns = value.parse().unwrap_or(50),
                "agent.idle_timeout" => config.idle_timeout = value.parse().unwrap_or(180),
                "agent.default_provider" => config.default_provider = value,
                _ if key.starts_with("agent.providers.") => {
                    let parts: Vec<&str> = key.split('.').collect();
                    if parts.len() == 4 {
                        let provider = parts[2];
                        let field = parts[3];
                        let provider_config = config.providers.entry(provider.into()).or_default();
                        match field {
                            "enabled" => provider_config.enabled = value == "true",
                            "is_default" => provider_config.is_default = value == "true",
                            "api_key" => {
                                provider_config.api_key =
                                    if value.is_empty() { None } else { Some(value) }
                            }
                            "base_url" => {
                                provider_config.base_url =
                                    if value.is_empty() { None } else { Some(value) }
                            }
                            "model" => {
                                provider_config.model =
                                    if value.is_empty() { None } else { Some(value) }
                            }
                            "reasoning_effort" => {
                                provider_config.reasoning_effort =
                                    if value.is_empty() { None } else { Some(value) }
                            }
                            "temperature" => provider_config.temperature = value.parse().ok(),
                            "system_prompt" => {
                                provider_config.system_prompt =
                                    if value.is_empty() { None } else { Some(value) }
                            }
                            _ => {}
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(config)
    }

    pub fn save_agent_config(&mut self, config: &AgentConfig) -> DesktopResult<AgentConfig> {
        let transaction = self.connection.transaction()?;
        let settings = [
            (
                "agent.codex_path",
                config.codex_path.clone().unwrap_or_default(),
            ),
            ("agent.default_access", config.default_access.clone()),
            ("agent.auto_start", config.auto_start.to_string()),
            ("agent.approval_policy", config.approval_policy.clone()),
            ("agent.sandbox_type", config.sandbox_type.clone()),
            ("agent.network_access", config.network_access.to_string()),
            ("agent.max_turns", config.max_turns.to_string()),
            ("agent.idle_timeout", config.idle_timeout.to_string()),
            ("agent.default_provider", config.default_provider.clone()),
        ];
        for (key, value) in settings {
            transaction.execute(
                "INSERT INTO desktop_settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                params![key, value],
            )?;
        }
        for (provider, provider_config) in &config.providers {
            let prefix = format!("agent.providers.{provider}.");
            let provider_settings = [
                (
                    format!("{prefix}enabled"),
                    provider_config.enabled.to_string(),
                ),
                (
                    format!("{prefix}is_default"),
                    provider_config.is_default.to_string(),
                ),
                (
                    format!("{prefix}api_key"),
                    provider_config.api_key.clone().unwrap_or_default(),
                ),
                (
                    format!("{prefix}base_url"),
                    provider_config.base_url.clone().unwrap_or_default(),
                ),
                (
                    format!("{prefix}model"),
                    provider_config.model.clone().unwrap_or_default(),
                ),
                (
                    format!("{prefix}reasoning_effort"),
                    provider_config.reasoning_effort.clone().unwrap_or_default(),
                ),
                (
                    format!("{prefix}temperature"),
                    provider_config
                        .temperature
                        .map(|t| t.to_string())
                        .unwrap_or_default(),
                ),
                (
                    format!("{prefix}system_prompt"),
                    provider_config.system_prompt.clone().unwrap_or_default(),
                ),
            ];
            for (key, value) in provider_settings {
                transaction.execute(
                    "INSERT INTO desktop_settings (key, value) VALUES (?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                    params![key, value],
                )?;
            }
        }
        transaction.commit()?;
        Ok(config.clone())
    }

    fn migrate(&self) -> DesktopResult<()> {
        self.connection
            .execute_batch(include_str!("../migrations/0001_desktop.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0002_agent_history.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0003_project_learning.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0004_settings.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0005_desktop_setup.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0006_desktop_work_group.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0007_saved_repository_urls.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0008_agent_task_actions.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0009_agent_task_execution.sql"))?;
        self.ensure_agent_task_column("archived", "INTEGER NOT NULL DEFAULT 0")?;
        self.ensure_agent_task_column("review_requested", "INTEGER NOT NULL DEFAULT 0")?;
        self.ensure_agent_task_column("execution_path", "TEXT")?;
        self.ensure_agent_task_column("worktree_branch", "TEXT")?;
        self.ensure_agent_task_column("run_status", "TEXT NOT NULL DEFAULT 'ready'")?;
        self.ensure_agent_task_column("surface", "TEXT NOT NULL DEFAULT 'chat'")?;
        self.ensure_agent_task_column("local_task_id", "INTEGER")?;
        self.connection
            .execute_batch(include_str!("../migrations/0010_task_runner_isolation.sql"))?;
        self.ensure_local_task_column("execution", "TEXT")?;
        self.ensure_local_task_column("workspace_path", "TEXT")?;
        self.ensure_local_task_column("scheduled_at", "TEXT")?;
        self.connection
            .execute_batch(include_str!("../migrations/0011_task_runner_task_execution.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0012_task_runner_workspace_scope.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0013_task_runner_task_controls.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0014_project_task_schedules.sql"))?;
        self.ensure_project_task_column("skill_path", "TEXT")?;
        self.connection
            .execute_batch(include_str!("../migrations/0015_project_task_skill_binding.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0016_project_task_run_history.sql"))?;
        self.ensure_project_task_run_column("agent_task_id", "INTEGER")?;
        self.ensure_project_task_column("position", "INTEGER NOT NULL DEFAULT 0")?;
        self.connection
            .execute_batch(include_str!("../migrations/0017_project_task_positions.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0018_project_task_run_interactions.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0019_desktop_work_groups.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0020_default_desktop_workspace.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0021_desktop_project_details.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0022_desktop_project_id_sequence.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0024_desktop_project_ideas.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0025_desktop_project_idea_discussions.sql"))?;
        self.ensure_desktop_project_changelog_path()?;
        self.ensure_project_detail_numbers()?;
        self.connection.execute_batch(
            "CREATE INDEX IF NOT EXISTS desktop_agent_tasks_workspace_status
             ON desktop_agent_tasks (workspace_path, run_status, updated_at DESC);",
        )?;
        self.ensure_profile_column("default_work_group_path", "TEXT")?;
        self.ensure_workspace_column("kind", "TEXT NOT NULL DEFAULT 'application'")?;
        self.ensure_workspace_column("relationship", "TEXT NOT NULL DEFAULT 'standalone'")?;
        self.ensure_workspace_column("project_name", "TEXT")?;
        self.ensure_workspace_column("pinned", "INTEGER NOT NULL DEFAULT 0")?;
        self.ensure_workspace_column("updated_at", "TEXT NOT NULL DEFAULT ''")?;
        Ok(())
    }

    fn ensure_workspace_column(&self, column: &str, definition: &str) -> DesktopResult<()> {
        let mut statement = self
            .connection
            .prepare("PRAGMA table_info(desktop_workspaces)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
        if columns.filter_map(Result::ok).any(|name| name == column) {
            return Ok(());
        }
        self.connection.execute_batch(&format!(
            "ALTER TABLE desktop_workspaces ADD COLUMN {column} {definition}"
        ))?;
        Ok(())
    }

    fn ensure_profile_column(&self, column: &str, definition: &str) -> DesktopResult<()> {
        let mut statement = self
            .connection
            .prepare("PRAGMA table_info(desktop_local_profile)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
        if columns.filter_map(Result::ok).any(|name| name == column) {
            return Ok(());
        }
        self.connection.execute_batch(&format!(
            "ALTER TABLE desktop_local_profile ADD COLUMN {column} {definition}"
        ))?;
        Ok(())
    }

    fn ensure_agent_task_column(&self, column: &str, definition: &str) -> DesktopResult<()> {
        let mut statement = self
            .connection
            .prepare("PRAGMA table_info(desktop_agent_tasks)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
        if columns.filter_map(Result::ok).any(|name| name == column) {
            return Ok(());
        }
        self.connection.execute_batch(&format!(
            "ALTER TABLE desktop_agent_tasks ADD COLUMN {column} {definition}"
        ))?;
        Ok(())
    }

    fn ensure_local_task_column(&self, column: &str, definition: &str) -> DesktopResult<()> {
        let mut statement = self
            .connection
            .prepare("PRAGMA table_info(desktop_tasks)")?;
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;
        if !columns.iter().any(|existing| existing == column) {
            self.connection
                .execute_batch(&format!("ALTER TABLE desktop_tasks ADD COLUMN {column} {definition}"))?;
        }
        Ok(())
    }

    fn ensure_project_task_column(&self, column: &str, definition: &str) -> DesktopResult<()> {
        let mut statement = self.connection.prepare("PRAGMA table_info(desktop_project_tasks)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>(1))?.collect::<Result<Vec<_>, _>>()?;
        if !columns.iter().any(|existing| existing == column) {
            self.connection.execute_batch(&format!("ALTER TABLE desktop_project_tasks ADD COLUMN {column} {definition}"))?;
        }
        Ok(())
    }

    fn ensure_project_task_run_column(&self, column: &str, definition: &str) -> DesktopResult<()> {
        let mut statement = self
            .connection
            .prepare("PRAGMA table_info(desktop_project_task_runs)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
        if columns.filter_map(Result::ok).any(|name| name == column) {
            return Ok(());
        }
        self.connection.execute_batch(&format!(
            "ALTER TABLE desktop_project_task_runs ADD COLUMN {column} {definition}"
        ))?;
        Ok(())
    }

    fn desktop_profile(&self) -> DesktopResult<Option<DesktopProfile>> {
        let mut statement = self.connection.prepare(
            "SELECT display_name, email, remember_identity, confirm_on_startup, default_work_group_path, last_workspace_path FROM desktop_local_profile WHERE id = 1",
        )?;
        let mut rows = statement.query([])?;
        let Some(row) = rows.next()? else {
            return Ok(None);
        };
        Ok(Some(DesktopProfile {
            display_name: row.get(0)?,
            email: row.get(1)?,
            remember_identity: row.get::<_, i64>(2)? != 0,
            confirm_on_startup: row.get::<_, i64>(3)? != 0,
            default_work_group_path: row.get(4)?,
            last_workspace_path: row.get(5)?,
        }))
    }

    fn default_workspace_path(&self) -> DesktopResult<Option<String>> {
        self.connection
            .query_row(
                "SELECT workspace_path FROM desktop_default_workspace WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(Into::into)
    }

    fn ensure_project_detail_numbers(&self) -> DesktopResult<()> {
        let mut statement = self.connection.prepare(
            "SELECT w.path
             FROM desktop_workspaces w
             LEFT JOIN desktop_project_details d ON d.workspace_path = w.path
             WHERE d.workspace_path IS NULL OR NULLIF(CAST(d.project_id AS INTEGER), 0) IS NULL
             ORDER BY w.path COLLATE NOCASE",
        )?;
        let paths = statement
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        for path in paths {
            self.ensure_project_detail_number(&path)?;
        }
        Ok(())
    }

    fn ensure_desktop_project_changelog_path(&self) -> DesktopResult<()> {
        let mut statement = self.connection.prepare("PRAGMA table_info(desktop_project_details)")?;
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;
        if !columns.iter().any(|column| column == "changelog_path") {
            self.connection.execute_batch("ALTER TABLE desktop_project_details ADD COLUMN changelog_path TEXT;")?;
        }
        self.connection.execute(
            "INSERT OR IGNORE INTO desktop_schema_migrations (version, description) VALUES (23, 'desktop project changelog location')",
            [],
        )?;
        Ok(())
    }

    fn ensure_project_detail_number(&self, path: &str) -> DesktopResult<()> {
        let has_number = self.connection.query_row(
            "SELECT NULLIF(CAST(project_id AS INTEGER), 0)
             FROM desktop_project_details WHERE workspace_path = ?1",
            params![path],
            |row| row.get::<_, Option<i64>>(0),
        ).optional()?.flatten().is_some();
        if has_number {
            return Ok(());
        }
        let project_id = self.next_project_id()?;
        self.connection.execute(
            "INSERT INTO desktop_project_details (workspace_path, project_id, updated_at)
             VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(workspace_path) DO UPDATE SET project_id = excluded.project_id, updated_at = CURRENT_TIMESTAMP",
            params![path, project_id],
        )?;
        Ok(())
    }

    fn next_project_id(&self) -> DesktopResult<i64> {
        self.connection.execute(
            "UPDATE desktop_project_id_sequence SET last_value = last_value + 1 WHERE id = 1",
            [],
        )?;
        self.connection.query_row(
            "SELECT last_value FROM desktop_project_id_sequence WHERE id = 1",
            [],
            |row| row.get(0),
        ).map_err(Into::into)
    }

    fn list_desktop_workspaces(&self) -> DesktopResult<Vec<DesktopWorkspace>> {
        let mut statement = self.connection.prepare(
            "SELECT w.path, w.name, w.kind, w.relationship, w.project_name,
                    d.tagline, d.changelog_path, d.owner_name, d.started_on, d.due_on, d.project_type,
                    COALESCE(d.priority, 'normal'), NULLIF(CAST(d.project_id AS INTEGER), 0),
                    w.pinned, w.last_opened_at
             FROM desktop_workspaces w
             LEFT JOIN desktop_project_details d ON d.workspace_path = w.path
             ORDER BY NULLIF(CAST(d.project_id AS INTEGER), 0), w.name COLLATE NOCASE, w.path COLLATE NOCASE",
        )?;
        let rows = statement.query_map([], desktop_workspace_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn list_desktop_work_groups(&self) -> DesktopResult<Vec<DesktopWorkGroup>> {
        let mut statement = self.connection.prepare(
            "SELECT path, name, is_default, updated_at FROM desktop_work_groups
             ORDER BY is_default DESC, updated_at DESC, name COLLATE NOCASE",
        )?;
        let rows = statement.query_map([], desktop_work_group_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn saved_repository_url(
        &self,
        work_group_path: &str,
        url: &str,
    ) -> DesktopResult<SavedRepositoryUrl> {
        self.connection
            .query_row(
                "SELECT id, work_group_path, url, kind, relationship, updated_at
             FROM desktop_saved_repository_urls WHERE work_group_path = ?1 AND url = ?2",
                params![work_group_path, url],
                saved_repository_url_from_row,
            )
            .map_err(Into::into)
    }

    pub fn desktop_workspace(&self, path: &str) -> DesktopResult<DesktopWorkspace> {
        self.workspace_by_path(path)
    }

    fn workspace_by_path(&self, path: &str) -> DesktopResult<DesktopWorkspace> {
        Ok(self.connection.query_row(
            "SELECT w.path, w.name, w.kind, w.relationship, w.project_name,
                    d.tagline, d.changelog_path, d.owner_name, d.started_on, d.due_on, d.project_type,
                    COALESCE(d.priority, 'normal'), NULLIF(CAST(d.project_id AS INTEGER), 0),
                    w.pinned, w.last_opened_at
             FROM desktop_workspaces w
             LEFT JOIN desktop_project_details d ON d.workspace_path = w.path
             WHERE w.path = ?1",
            params![path], desktop_workspace_from_row,
        )?)
    }
}

fn desktop_workspace_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<DesktopWorkspace> {
    Ok(DesktopWorkspace {
        path: row.get(0)?,
        name: row.get(1)?,
        kind: row.get(2)?,
        relationship: row.get(3)?,
        project_name: row.get(4)?,
        tagline: row.get(5)?,
        changelog_path: row.get(6)?,
        owner_name: row.get(7)?,
        started_on: row.get(8)?,
        due_on: row.get(9)?,
        project_type: row.get(10)?,
        priority: row.get(11)?,
        project_id: row.get(12)?,
        pinned: row.get::<_, i64>(13)? != 0,
        last_opened_at: row.get(14)?,
    })
}

fn desktop_work_group_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<DesktopWorkGroup> {
    Ok(DesktopWorkGroup {
        path: row.get(0)?,
        name: row.get(1)?,
        is_default: row.get::<_, i64>(2)? != 0,
        updated_at: row.get(3)?,
    })
}

fn saved_repository_url_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SavedRepositoryUrl> {
    Ok(SavedRepositoryUrl {
        id: row.get(0)?,
        work_group_path: row.get(1)?,
        url: row.get(2)?,
        kind: row.get(3)?,
        relationship: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn project_task_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectTask> {
    Ok(ProjectTask {
        id: row.get(0)?,
        title: row.get(1)?,
        instructions: row.get(2)?,
        position: row.get(3)?,
        schedule: row.get(4)?,
        agent_model: row.get(5)?,
        status: row.get(6)?,
        skill_path: row.get(7)?,
    })
}

fn project_task_run_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectTaskRun> {
    Ok(ProjectTaskRun {
        id: row.get(0)?,
        project_task_id: row.get(1)?,
        agent_task_id: row.get(2)?,
        status: row.get(3)?,
        summary: row.get(4)?,
        created_at: row.get(5)?,
    })
}

fn project_idea_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectIdea> {
    Ok(ProjectIdea {
        id: row.get(0)?, workspace_path: row.get(1)?, title: row.get(2)?, context: row.get(3)?,
        discussion: row.get(4)?, status: row.get(5)?, converted_task_id: row.get(6)?,
        created_at: row.get(7)?, updated_at: row.get(8)?, discussion_count: row.get(9)?,
    })
}

fn agent_task_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<AgentTask> {
    Ok(AgentTask {
        id: row.get(0)?,
        thread_id: row.get(1)?,
        title: row.get(2)?,
        access: row.get(3)?,
        archived: row.get::<_, i64>(4)? != 0,
        review_requested: row.get::<_, i64>(5)? != 0,
        updated_at: row.get(6)?,
        execution_path: row.get(7)?,
        worktree_branch: row.get(8)?,
        run_status: row.get(9)?,
    })
}

#[cfg(test)]
mod tests {
    use super::{DesktopDatabase, DesktopProfile, DesktopWorkspace};

    #[test]
    fn persists_agent_tasks_and_messages_per_workspace() {
        let path =
            std::env::temp_dir().join(format!("neot-agent-history-{}.db", uuid::Uuid::new_v4()));
        let mut database = DesktopDatabase::open(path.clone()).expect("open test database");

        let task = database
            .save_agent_task(
                "C:/work/neot",
                "thread-1",
                "Fix startup",
                "workspaceWrite",
                "chat",
                None,
            )
            .expect("save agent task");
        let task = database
            .set_agent_task_execution(
                "C:/work/neot",
                task.id,
                "C:/work/.neot-worktrees/task-1",
                "neot/task-1",
            )
            .expect("save task worktree");
        assert_eq!(task.run_status, "ready");
        assert_eq!(task.worktree_branch.as_deref(), Some("neot/task-1"));
        assert_eq!(
            database
                .agent_task_execution_path("C:/work/neot", task.id)
                .expect("read task worktree"),
            "C:/work/.neot-worktrees/task-1"
        );
        database
            .save_agent_message(task.id, "message-1", "user", "Make startup faster")
            .expect("save user message");
        database
            .save_agent_message(task.id, "message-2", "agent", "Startup is now deferred.")
            .expect("save agent message");

        assert_eq!(
            database.list_agent_tasks("C:/work/neot").unwrap().len(),
            1
        );
        assert!(database
            .list_agent_tasks("C:/work/other")
            .unwrap()
            .is_empty());
        let messages = database.list_agent_messages(task.id).unwrap();
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[1].content, "Startup is now deferred.");
        assert!(database
            .delete_agent_message(task.id, "message-1")
            .expect("delete unaccepted message"));
        let messages = database.list_agent_messages(task.id).unwrap();
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].id, "message-2");
        database
            .rename_agent_task("C:/work/neot", task.id, "Startup discussion")
            .expect("rename agent task");

        drop(database);
        let database = DesktopDatabase::open(path.clone()).expect("reopen test database");
        assert_eq!(
            database
                .get_agent_task("C:/work/neot", task.id)
                .expect("load renamed task after reopen")
                .title,
            "Startup discussion"
        );
        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn archives_reviews_and_deletes_agent_tasks_per_workspace() {
        let path = std::env::temp_dir().join(format!(
            "neot-agent-task-actions-{}.db",
            uuid::Uuid::new_v4()
        ));
        let mut database = DesktopDatabase::open(path.clone()).expect("open test database");
        let task = database
            .save_agent_task(
                "C:/work/neot",
                "thread-actions",
                "Review me",
                "workspaceWrite",
                "chat",
                None,
            )
            .expect("save agent task");

        let reviewed = database
            .request_agent_task_review("C:/work/neot", task.id)
            .expect("request review");
        assert!(reviewed.review_requested);
        let renamed = database
            .rename_agent_task("C:/work/neot", task.id, "Release review")
            .expect("rename task");
        assert_eq!(renamed.title, "Release review");
        assert_eq!(
            database
                .get_agent_task("C:/work/neot", task.id)
                .expect("load renamed task")
                .title,
            "Release review"
        );
        assert!(database
            .rename_agent_task("C:/work/other", task.id, "Wrong workspace")
            .is_err());
        assert!(database
            .archive_agent_task("C:/work/neot", task.id)
            .expect("archive task"));
        assert!(database
            .list_agent_tasks("C:/work/neot")
            .unwrap()
            .is_empty());
        assert!(database
            .delete_agent_task("C:/work/neot", task.id)
            .expect("delete task"));

        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn persists_local_identity_and_workspace_mapping() {
        let path =
            std::env::temp_dir().join(format!("neot-desktop-setup-{}.db", uuid::Uuid::new_v4()));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        database
            .save_desktop_profile(&DesktopProfile {
                display_name: "Aaran".into(),
                email: Some("aaran@example.com".into()),
                remember_identity: true,
                confirm_on_startup: false,
                default_work_group_path: Some("C:/work".into()),
                last_workspace_path: None,
            })
            .expect("save profile");
        database
            .save_desktop_workspace(&DesktopWorkspace {
                path: "C:/work/sample".into(),
                name: "sample".into(),
                kind: "plugin".into(),
                relationship: "addOn".into(),
                project_name: Some("NEOT".into()),
                tagline: None,
                changelog_path: None,
                owner_name: None,
                started_on: None,
                due_on: None,
                project_type: None,
                priority: "normal".into(),
                project_id: None,
                pinned: false,
                last_opened_at: String::new(),
            })
            .expect("save workspace");
        database
            .mark_workspace_opened("C:/work/sample", "sample")
            .expect("mark opened");
        drop(database);
        let database = DesktopDatabase::open(path.clone()).expect("reopen migrated database");
        let setup = database.desktop_setup().expect("load setup");
        let profile = setup.profile.expect("profile");
        assert_eq!(profile.display_name, "Aaran");
        assert_eq!(profile.default_work_group_path.as_deref(), Some("C:/work"));
        assert_eq!(setup.workspaces[0].relationship, "addOn");
        let reset = database
            .reset_default_work_group()
            .expect("reset work group");
        assert_eq!(reset.default_work_group_path, None);
        assert_eq!(reset.last_workspace_path, None);
        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn persists_multiple_workspace_folders_with_one_default() {
        let path = std::env::temp_dir().join(format!(
            "neot-work-group-history-{}.db",
            uuid::Uuid::new_v4()
        ));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        database
            .save_desktop_profile(&DesktopProfile {
                display_name: "Aaran".into(),
                email: None,
                remember_identity: true,
                confirm_on_startup: false,
                default_work_group_path: None,
                last_workspace_path: None,
            })
            .expect("save profile");
        database
            .save_default_work_group("C:/work/first")
            .expect("save first folder");
        database
            .save_default_work_group("C:/work/second")
            .expect("save second folder");

        let setup = database.desktop_setup().expect("load persisted folders");
        assert_eq!(setup.work_groups.len(), 2);
        assert_eq!(setup.work_groups[0].path, "C:/work/second");
        assert!(setup.work_groups[0].is_default);
        assert!(!setup.work_groups[1].is_default);

        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn keeps_workspace_list_order_when_a_workspace_opens() {
        let path = std::env::temp_dir().join(format!(
            "neot-workspace-order-{}.db",
            uuid::Uuid::new_v4()
        ));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        for (name, path) in [
            ("cxapp", "C:/work/cxapp"),
            ("cxshop", "C:/work/cxshop"),
            ("neot", "C:/work/neot"),
        ] {
            database
                .save_desktop_workspace(&DesktopWorkspace {
                    path: path.into(),
                    name: name.into(),
                    kind: "application".into(),
                    relationship: "project".into(),
                    project_name: None,
                    tagline: None,
                    changelog_path: None,
                    owner_name: None,
                    started_on: None,
                    due_on: None,
                    project_type: None,
                    priority: "normal".into(),
                    project_id: None,
                    pinned: false,
                    last_opened_at: String::new(),
                })
                .expect("save workspace");
        }

        database
            .mark_workspace_opened("C:/work/neot", "neot")
            .expect("open workspace");
        let names = database
            .list_desktop_workspaces()
            .expect("list workspaces")
            .into_iter()
            .map(|workspace| workspace.name)
            .collect::<Vec<_>>();

        assert_eq!(names, ["cxapp", "cxshop", "neot"]);
        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn persists_one_default_workspace_and_clears_it_when_removed() {
        let path = std::env::temp_dir().join(format!(
            "neot-default-workspace-{}.db",
            uuid::Uuid::new_v4()
        ));
        let mut database = DesktopDatabase::open(path.clone()).expect("open test database");
        for name in ["cxapp", "neot"] {
            database
                .save_desktop_workspace(&DesktopWorkspace {
                    path: format!("C:/work/{name}"),
                    name: name.into(),
                    kind: "application".into(),
                    relationship: "project".into(),
                    project_name: None,
                    tagline: None,
                    changelog_path: None,
                    owner_name: None,
                    started_on: None,
                    due_on: None,
                    project_type: None,
                    priority: "normal".into(),
                    project_id: None,
                    pinned: false,
                    last_opened_at: String::new(),
                })
                .expect("save workspace");
        }

        database
            .set_default_desktop_workspace("C:/work/cxapp")
            .expect("set first default");
        database
            .set_default_desktop_workspace("C:/work/neot")
            .expect("replace default");
        assert_eq!(
            database
                .desktop_setup()
                .expect("load setup")
                .default_workspace_path
                .as_deref(),
            Some("C:/work/neot")
        );

        database
            .clear_default_desktop_workspace()
            .expect("clear default");
        assert_eq!(
            database
                .desktop_setup()
                .expect("load setup")
                .default_workspace_path,
            None
        );
        database
            .set_default_desktop_workspace("C:/work/neot")
            .expect("restore default");

        database
            .remove_desktop_workspace("C:/work/neot")
            .expect("remove default workspace");
        assert_eq!(
            database
                .desktop_setup()
                .expect("load setup")
                .default_workspace_path,
            None
        );
        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn saves_project_details_and_orders_registered_projects_by_project_id() {
        let path = std::env::temp_dir().join(format!(
            "neot-project-details-{}.db",
            uuid::Uuid::new_v4()
        ));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        for name in ["later", "first"] {
            database
                .save_desktop_workspace(&DesktopWorkspace {
                    path: format!("C:/work/{name}"),
                    name: name.into(),
                    kind: "application".into(),
                    relationship: "project".into(),
                    project_name: Some(name.into()),
                    tagline: None,
                    changelog_path: None,
                    owner_name: None,
                    started_on: None,
                    due_on: None,
                    project_type: None,
                    priority: "normal".into(),
                    project_id: None,
                    pinned: false,
                    last_opened_at: String::new(),
                })
                .expect("save workspace");
            database
                .save_desktop_project_details(&DesktopWorkspace {
                    path: format!("C:/work/{name}"),
                    name: name.into(),
                    kind: "application".into(),
                    relationship: "project".into(),
                    project_name: Some(name.into()),
                    tagline: Some(format!("{name} project")),
                    changelog_path: None,
                    owner_name: Some("Sundar".into()),
                    started_on: Some("2026-08-23".into()),
                    due_on: Some("2026-09-01".into()),
                    project_type: Some("Desktop application".into()),
                    priority: "high".into(),
                    project_id: None,
                    pinned: false,
                    last_opened_at: String::new(),
                })
                .expect("save project details");
        }

        let workspaces = database.desktop_setup().expect("load project details").workspaces;
        assert_eq!(workspaces.iter().map(|item| item.name.as_str()).collect::<Vec<_>>(), ["later", "first"]);
        assert_eq!(workspaces[0].owner_name.as_deref(), Some("Sundar"));
        assert_eq!(workspaces[0].project_type.as_deref(), Some("Desktop application"));
        assert_eq!(workspaces[0].project_id, Some(1));
        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn upgrades_legacy_text_project_ids_without_blocking_desktop_setup() {
        let path = std::env::temp_dir().join(format!(
            "neot-legacy-project-id-{}.db",
            uuid::Uuid::new_v4()
        ));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        database
            .save_desktop_workspace(&DesktopWorkspace {
                path: "C:/work/legacy".into(),
                name: "legacy".into(),
                kind: "application".into(),
                relationship: "project".into(),
                project_name: None,
                tagline: None,
                changelog_path: None,
                owner_name: None,
                started_on: None,
                due_on: None,
                project_type: None,
                priority: "normal".into(),
                project_id: None,
                pinned: false,
                last_opened_at: String::new(),
            })
            .expect("save workspace");
        database
            .connection
            .execute(
                "UPDATE desktop_project_details SET project_id = 'legacy-id' WHERE workspace_path = ?1",
                ["C:/work/legacy"],
            )
            .expect("write legacy project ID");
        drop(database);

        let database = DesktopDatabase::open(path.clone()).expect("reopen legacy database");
        let project = database
            .desktop_setup()
            .expect("load desktop setup")
            .workspaces
            .pop()
            .expect("project");
        assert!(project.project_id.is_some());
        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn pins_and_removes_workspace_mappings_without_touching_the_folder() {
        let path = std::env::temp_dir().join(format!(
            "neot-workspace-actions-{}.db",
            uuid::Uuid::new_v4()
        ));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        database
            .save_desktop_workspace(&DesktopWorkspace {
                path: "C:/work/sample".into(),
                name: "sample".into(),
                kind: "application".into(),
                relationship: "project".into(),
                project_name: None,
                tagline: None,
                changelog_path: None,
                owner_name: None,
                started_on: None,
                due_on: None,
                project_type: None,
                priority: "normal".into(),
                project_id: None,
                pinned: false,
                last_opened_at: String::new(),
            })
            .expect("save workspace");

        assert!(
            database
                .set_desktop_workspace_pinned("C:/work/sample", true)
                .expect("pin workspace")
                .pinned
        );
        assert!(database
            .remove_desktop_workspace("C:/work/sample")
            .expect("remove workspace mapping"));
        assert!(database
            .desktop_setup()
            .expect("load setup")
            .workspaces
            .is_empty());

        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn saves_repository_urls_per_work_group() {
        let path =
            std::env::temp_dir().join(format!("neot-repository-url-{}.db", uuid::Uuid::new_v4()));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");

        database
            .save_repository_url(
                "C:/work",
                "https://github.com/CODEXSUN/neot.git",
                "application",
                "project",
            )
            .expect("save repository URL");
        database
            .save_repository_url(
                "C:/other",
                "https://github.com/CODEXSUN/zetro.git",
                "application",
                "project",
            )
            .expect("save separate work group URL");

        let urls = database
            .list_repository_urls("C:/work")
            .expect("list repository URLs");
        assert_eq!(urls.len(), 1);
        assert_eq!(urls[0].url, "https://github.com/CODEXSUN/neot.git");

        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn copies_project_tasks_only_to_registered_projects() {
        let path = std::env::temp_dir().join(format!(
            "neot-project-task-copy-{}.db",
            uuid::Uuid::new_v4()
        ));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        let source = database
            .save_project_task(
                "C:/work/source",
                "Review changes",
                "Run the release checklist.",
                "every-monday",
                "codex:gpt-5.6-terra",
                Some("C:/skills/release/SKILL.md"),
            )
            .expect("save source task");
        database
            .save_desktop_workspace(&DesktopWorkspace {
                path: "C:/work/target".into(),
                name: "target".into(),
                kind: "application".into(),
                relationship: "project".into(),
                project_name: None,
                tagline: None,
                changelog_path: None,
                owner_name: None,
                started_on: None,
                due_on: None,
                project_type: None,
                priority: "normal".into(),
                project_id: None,
                pinned: false,
                last_opened_at: String::new(),
            })
            .expect("register target project");

        let copied = database
            .copy_project_task_to_workspace("C:/work/source", source.id, "C:/work/target")
            .expect("copy task");
        assert_eq!(copied.title, "Review changes");
        assert_eq!(copied.skill_path.as_deref(), Some("C:/skills/release/SKILL.md"));
        assert_eq!(database.list_project_tasks("C:/work/source").unwrap().len(), 1);
        assert_eq!(database.list_project_tasks("C:/work/target").unwrap().len(), 1);
        assert!(database
            .copy_project_task_to_workspace("C:/work/source", source.id, "C:/work/missing")
            .is_err());

        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }
}
