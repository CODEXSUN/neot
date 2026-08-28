use tauri::{AppHandle, Emitter, State};

use crate::database::{ProjectTask, ProjectTaskRun};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

use super::workspace_root;

#[tauri::command]
pub fn list_project_tasks(state: State<'_, DesktopState>) -> DesktopResult<Vec<ProjectTask>> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.list_project_tasks(&workspace))
}

#[tauri::command]
pub fn save_project_task(title: String, instructions: String, schedule: String, agent_model: String, skill_path: Option<String>, state: State<'_, DesktopState>) -> DesktopResult<ProjectTask> {
    let (title, instructions, schedule, agent_model) = validated(title, instructions, schedule, agent_model)?;
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.save_project_task(&workspace, &title, &instructions, &schedule, &agent_model, skill_path.as_deref()))
}

#[tauri::command]
pub fn update_project_task(task_id: i64, title: String, instructions: String, schedule: String, agent_model: String, skill_path: Option<String>, status: String, state: State<'_, DesktopState>) -> DesktopResult<ProjectTask> {
    let (title, instructions, schedule, agent_model) = validated(title, instructions, schedule, agent_model)?;
    let status = status.trim();
    if !["active", "paused"].contains(&status) {
        return Err(DesktopError::Policy("Unknown project task status.".into()));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.update_project_task(&workspace, task_id, &title, &instructions, &schedule, &agent_model, skill_path.as_deref(), status))
}

#[tauri::command]
pub fn delete_project_task(task_id: i64, state: State<'_, DesktopState>) -> DesktopResult<bool> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.delete_project_task(&workspace, task_id))
}

#[tauri::command]
pub fn copy_project_task_to_workspace(
    task_id: i64,
    destination_workspace_path: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectTask> {
    let source_workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    let destination_workspace = destination_workspace_path.trim();
    if destination_workspace.is_empty() {
        return Err(DesktopError::Policy("Choose a destination project.".into()));
    }
    state.with_database(|database| {
        database.copy_project_task_to_workspace(&source_workspace, task_id, destination_workspace)
    })
}

#[tauri::command]
pub fn move_project_task(task_id: i64, direction: String, state: State<'_, DesktopState>) -> DesktopResult<Vec<ProjectTask>> {
    if !["up", "down"].contains(&direction.as_str()) {
        return Err(DesktopError::Policy("Unknown project task direction.".into()));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.move_project_task(&workspace, task_id, &direction))
}

#[tauri::command]
pub fn queue_project_task_run(
    task_id: i64,
    app: AppHandle,
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectTaskRun> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    let run = state.with_database(|database| database.queue_project_task_run(&workspace, task_id))?;
    emit_run_change(&app, &run);
    Ok(run)
}

#[tauri::command]
pub fn list_project_task_runs(task_id: i64, state: State<'_, DesktopState>) -> DesktopResult<Vec<ProjectTaskRun>> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state.with_database(|database| database.list_project_task_runs(&workspace, task_id))
}

#[tauri::command]
pub fn update_project_task_run(
    run_id: i64,
    status: String,
    summary: String,
    app: AppHandle,
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectTaskRun> {
    if !["running", "awaiting-input", "completed", "failed", "stopped"].contains(&status.as_str()) || summary.trim().is_empty() {
        return Err(DesktopError::Policy("Project task run update is invalid.".into()));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    let run = state.with_database(|database| database.update_project_task_run(&workspace, run_id, &status, summary.trim()))?;
    emit_run_change(&app, &run);
    Ok(run)
}

#[tauri::command]
pub fn bind_project_task_run_agent_task(
    run_id: i64,
    agent_task_id: i64,
    app: AppHandle,
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectTaskRun> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    let run = state.with_database(|database| {
        database.bind_project_task_run_agent_task(&workspace, run_id, agent_task_id)
    })?;
    emit_run_change(&app, &run);
    Ok(run)
}

#[tauri::command]
pub fn delete_project_task_run(
    run_id: i64,
    app: AppHandle,
    state: State<'_, DesktopState>,
) -> DesktopResult<bool> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    let deleted = state.with_database(|database| database.delete_project_task_run(&workspace, run_id))?;
    if deleted {
        let _ = app.emit("project-task-run-changed", run_id);
    }
    Ok(deleted)
}

fn emit_run_change(app: &AppHandle, run: &ProjectTaskRun) {
    let _ = app.emit("project-task-run-changed", run);
}

fn validated(title: String, instructions: String, schedule: String, agent_model: String) -> DesktopResult<(String, String, String, String)> {
    let title = title.trim().to_owned();
    let instructions = instructions.trim().to_owned();
    let schedule = schedule.trim().to_owned();
    let agent_model = agent_model.trim().to_owned();
    if title.is_empty() || title.len() > 180 || instructions.is_empty() || !["manual", "every-monday", "before-commit", "on-version-update"].contains(&schedule.as_str()) || !["codex:gpt-5.6-terra", "codex:gpt-5.6-luna", "opencode:nemotron-3-ultra-free", "gemini:gemini-2.0-flash", "ollama:local-model"].contains(&agent_model.as_str()) {
        return Err(DesktopError::Policy("Project task details are invalid.".into()));
    }
    Ok((title, instructions, schedule, agent_model))
}
