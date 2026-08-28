use tauri::State;

use crate::database::LocalTask;
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

use super::workspace_root;

#[tauri::command]
pub fn list_local_tasks(state: State<'_, DesktopState>) -> DesktopResult<Vec<LocalTask>> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.list_local_tasks(&workspace))
}

#[tauri::command]
pub fn save_local_task(title: String, execution: String, state: State<'_, DesktopState>) -> DesktopResult<LocalTask> {
    let title = title.trim();
    let execution = execution.trim();
    if title.is_empty() || title.len() > 180 {
        return Err(DesktopError::Policy("Task titles must be between 1 and 180 characters.".into()));
    }
    if execution.is_empty() {
        return Err(DesktopError::Policy("Task execution instructions are required.".into()));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.save_local_task(&workspace, title, execution))
}

#[tauri::command]
pub fn set_local_task_status(task_id: i64, status: String, state: State<'_, DesktopState>) -> DesktopResult<LocalTask> {
    if !["todo", "active", "done", "paused", "scheduled"].contains(&status.as_str()) {
        return Err(DesktopError::Policy("Unknown local task status.".into()));
    }
    state.with_database(|database| database.set_local_task_status(task_id, &status))
}

#[tauri::command]
pub fn update_local_task(task_id: i64, title: String, execution: String, status: String, scheduled_at: Option<String>, state: State<'_, DesktopState>) -> DesktopResult<LocalTask> {
    let title = title.trim();
    let execution = execution.trim();
    if title.is_empty() || title.len() > 180 {
        return Err(DesktopError::Policy("Task titles must be between 1 and 180 characters.".into()));
    }
    if execution.is_empty() {
        return Err(DesktopError::Policy("Task execution instructions are required.".into()));
    }
    if !["todo", "active", "done", "paused", "scheduled"].contains(&status.as_str()) {
        return Err(DesktopError::Policy("Unknown local task status.".into()));
    }
    let scheduled_at = scheduled_at.as_deref().map(str::trim).filter(|value| !value.is_empty());
    if status == "scheduled" && scheduled_at.is_none() {
        return Err(DesktopError::Policy("Scheduled tasks need a date and time.".into()));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.update_local_task(&workspace, task_id, title, execution, &status, scheduled_at))
}

#[tauri::command]
pub fn force_delete_local_task(task_id: i64, state: State<'_, DesktopState>) -> DesktopResult<bool> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.force_delete_local_task(&workspace, task_id))
}
