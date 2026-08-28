pub mod agent;
pub mod compass_release;
pub mod agent_history;
pub mod files;
pub mod git;
pub mod integrations;
pub mod learning;
pub mod process;
pub mod project_tasks;
pub mod python;
pub mod search;
pub mod settings;
pub mod skills;
pub mod sync;
pub mod tasks;
pub mod system;
pub mod terminal;
pub mod work_group;
mod workspace_policy;

use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::process::Command;

use tauri::State;

use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

pub(crate) fn sanitize_path(path: impl AsRef<Path>) -> PathBuf {
    let p = path.as_ref();
    let s = p.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        p.to_path_buf()
    }
}

pub(crate) fn workspace_root(state: &State<'_, DesktopState>) -> DesktopResult<PathBuf> {
    let raw = state
        .workspace
        .lock()
        .map_err(|_| DesktopError::Policy("Workspace state is unavailable.".into()))?
        .clone()
        .ok_or_else(|| DesktopError::Policy("Open a workspace first.".into()))?;
    Ok(sanitize_path(raw))
}

pub(crate) fn workspace_path(
    state: &State<'_, DesktopState>,
    input: &str,
) -> DesktopResult<PathBuf> {
    let root = workspace_root(state)?;
    let clean_input = input.trim();
    if clean_input.is_empty() || clean_input == "." {
        return Ok(root);
    }
    let input_path = Path::new(clean_input);
    let candidate = if input_path.is_absolute() {
        sanitize_path(input_path)
    } else {
        root.join(input_path)
    };

    let resolved = candidate
        .canonicalize()
        .map(sanitize_path)
        .unwrap_or_else(|_| sanitize_path(&candidate));

    if !resolved.starts_with(&root) {
        return Err(DesktopError::Policy(
            "The path is outside the open workspace.".into(),
        ));
    }
    Ok(resolved)
}

pub(crate) fn display_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Workspace")
        .to_owned()
}

pub(crate) fn background_command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
}
