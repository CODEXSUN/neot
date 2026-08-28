use tauri::State;

use crate::database::{AgentMessage, AgentTask};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

use super::workspace_root;

#[tauri::command]
pub fn list_agent_tasks(state: State<'_, DesktopState>) -> DesktopResult<Vec<AgentTask>> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.list_agent_tasks(&workspace))
}

#[tauri::command]
pub fn get_agent_task(task_id: i64, state: State<'_, DesktopState>) -> DesktopResult<AgentTask> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.get_agent_task(&workspace, task_id))
}

#[tauri::command]
pub fn save_agent_task(
    thread_id: String,
    title: String,
    access: String,
    surface: Option<String>,
    local_task_id: Option<i64>,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentTask> {
    let thread_id = required(&thread_id, "Codex thread")?;
    let title = required(&title, "Task title")?;
    if title.len() > 180 {
        return Err(DesktopError::Policy(
            "Task titles cannot exceed 180 characters.".into(),
        ));
    }
    if !["readOnly", "workspaceWrite"].contains(&access.as_str()) {
        return Err(DesktopError::Policy("Unknown agent access mode.".into()));
    }
    let root = workspace_root(&state)?;
    let workspace = root.to_string_lossy().into_owned();
    let surface = surface.unwrap_or_else(|| "chat".into());
    if !["chat", "runner", "project"].contains(&surface.as_str()) {
        return Err(DesktopError::Policy("Unknown task surface.".into()));
    }
    if surface == "chat" && access != "readOnly" {
        return Err(DesktopError::Policy(
            "Repository discussions are read-only. Select a project and open its Coder Agent to modify code."
                .into(),
        ));
    }
    if ["runner", "project"].contains(&surface.as_str()) && local_task_id.is_none() {
        return Err(DesktopError::Policy("Runnable tasks need a task reference.".into()));
    }
    let task = state.with_database(|database| {
        database.save_agent_task(&workspace, thread_id, title, &access, &surface, local_task_id)
    })?;
    if access == "readOnly" || task.execution_path.is_some() {
        return Ok(task);
    }
    let worktree = match super::git::create_agent_task_worktree(&root, task.id) {
        Ok(worktree) => worktree,
        Err(error) => {
            let _ = state.with_database(|database| database.delete_agent_task(&workspace, task.id));
            return Err(error);
        }
    };
    state.with_database(|database| {
        database.set_agent_task_execution(&workspace, task.id, &worktree.path, &worktree.branch)
    })
}

#[tauri::command]
pub fn get_runner_task(local_task_id: i64, state: State<'_, DesktopState>) -> DesktopResult<Option<AgentTask>> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.runner_task(&workspace, local_task_id))
}

#[tauri::command]
pub fn set_agent_task_status(
    task_id: i64,
    status: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentTask> {
    if !["ready", "running", "completed", "failed", "stopped"].contains(&status.as_str()) {
        return Err(DesktopError::Policy("Unknown agent task status.".into()));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.set_agent_task_status(&workspace, task_id, &status))
}

#[tauri::command]
pub fn list_agent_messages(
    task_id: i64,
    state: State<'_, DesktopState>,
) -> DesktopResult<Vec<AgentMessage>> {
    state.with_database(|database| database.list_agent_messages(task_id))
}

#[tauri::command]
pub fn save_agent_message(
    task_id: i64,
    id: String,
    role: String,
    content: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentMessage> {
    let id = required(&id, "Message identifier")?;
    let content = required(&content, "Message")?;
    if !["agent", "user"].contains(&role.as_str()) {
        return Err(DesktopError::Policy("Unknown message role.".into()));
    }
    if content.len() > 1_000_000 {
        return Err(DesktopError::Policy(
            "Agent messages are too large to save.".into(),
        ));
    }
    state.with_database(|database| database.save_agent_message(task_id, id, &role, content))
}

#[tauri::command]
pub fn delete_agent_message(
    task_id: i64,
    id: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<bool> {
    let id = required(&id, "Message identifier")?;
    state.with_database(|database| database.delete_agent_message(task_id, id))
}

#[tauri::command]
pub fn archive_agent_task(task_id: i64, state: State<'_, DesktopState>) -> DesktopResult<bool> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.archive_agent_task(&workspace, task_id))
}

#[tauri::command]
pub fn rename_agent_task(
    task_id: i64,
    title: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentTask> {
    let title = required(&title, "Chat title")?;
    if title.len() > 180 {
        return Err(DesktopError::Policy(
            "Chat titles cannot exceed 180 characters.".into(),
        ));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.rename_agent_task(&workspace, task_id, title))
}

#[tauri::command]
pub fn delete_agent_task(task_id: i64, state: State<'_, DesktopState>) -> DesktopResult<bool> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.delete_agent_task(&workspace, task_id))
}

#[tauri::command]
pub fn request_agent_task_review(
    task_id: i64,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentTask> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.request_agent_task_review(&workspace, task_id))
}

fn required<'a>(value: &'a str, label: &str) -> DesktopResult<&'a str> {
    let value = value.trim();
    if value.is_empty() {
        return Err(DesktopError::Policy(format!("{label} is required.")));
    }
    Ok(value)
}
