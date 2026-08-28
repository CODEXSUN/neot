use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::State;

use crate::commands::workspace_policy::is_hidden_workspace_entry;
use crate::commands::{
    background_command, display_name, sanitize_path, workspace_path, workspace_root,
};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    name: String,
    path: String,
    branch: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    name: String,
    path: String,
    kind: String,
}

#[tauri::command]
pub fn open_workspace(
    path: Option<String>,
    state: State<'_, DesktopState>,
) -> DesktopResult<Workspace> {
    let raw_path = path.filter(|p| !p.trim().is_empty());
    let selected: PathBuf = std::env::var_os("NEOT_WORKSPACE")
        .or_else(|| std::env::var_os("CODELOGIX_WORKSPACE"))
        .map(Into::into)
        .or_else(|| raw_path.map(Into::into))
        .or_else(|| rfd::FileDialog::new().pick_folder())
        .ok_or_else(|| DesktopError::Policy("Workspace selection was canceled.".into()))?;
    let root = selected
        .canonicalize()
        .map(sanitize_path)
        .unwrap_or_else(|_| sanitize_path(&selected));
    if !root.is_dir() {
        return Err(DesktopError::Policy(
            "The workspace must be a directory.".into(),
        ));
    }
    *state
        .workspace
        .lock()
        .map_err(|_| DesktopError::Policy("Workspace state is unavailable.".into()))? =
        Some(root.clone());
    let branch = super::git::current_branch(&root).unwrap_or_else(|_| "no branch".into());
    let path = root.display().to_string();
    let name = display_name(&root);
    state.with_database(|database| database.mark_workspace_opened(&path, &name))?;
    Ok(Workspace { name, path, branch })
}

#[tauri::command]
pub fn open_workspace_folder(path: String) -> DesktopResult<()> {
    let folder = PathBuf::from(path.trim())
        .canonicalize()
        .map(sanitize_path)?;
    if !folder.is_dir() {
        return Err(DesktopError::Policy(
            "The selected workspace folder is unavailable.".into(),
        ));
    }
    #[cfg(windows)]
    background_command("explorer").arg(folder).spawn()?;
    #[cfg(not(windows))]
    background_command("xdg-open").arg(folder).spawn()?;
    Ok(())
}

#[tauri::command]
pub fn list_files(path: String, state: State<'_, DesktopState>) -> DesktopResult<Vec<FileEntry>> {
    let root = workspace_root(&state)?;
    let directory = workspace_path(&state, &path)?;
    let mut entries = fs::read_dir(directory)?
        .filter_map(Result::ok)
        .filter(|entry| !is_hidden_workspace_entry(&entry.file_name().to_string_lossy()))
        .map(|entry| {
            let absolute = sanitize_path(entry.path());
            let relative = absolute
                .strip_prefix(&root)
                .unwrap_or(&absolute)
                .display()
                .to_string();
            FileEntry {
                name: entry.file_name().to_string_lossy().into_owned(),
                path: relative,
                kind: if absolute.is_dir() {
                    "directory".into()
                } else {
                    "file".into()
                },
            }
        })
        .collect::<Vec<_>>();
    entries.sort_by(|a, b| {
        a.kind
            .cmp(&b.kind)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

#[tauri::command]
pub fn read_text_file(path: String, state: State<'_, DesktopState>) -> DesktopResult<String> {
    Ok(fs::read_to_string(workspace_path(&state, &path)?)?)
}

#[tauri::command]
pub fn write_text_file(
    path: String,
    content: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<()> {
    fs::write(workspace_path(&state, &path)?, content)?;
    Ok(())
}
