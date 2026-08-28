use serde::Serialize;
use tauri::State;

use crate::commands::{background_command, workspace_root};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

const ALLOWED_COMMANDS: &[&str] = &["cargo", "docker", "git", "node", "npm", "npm.cmd"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalResult {
    code: Option<i32>,
    stderr: String,
    stdout: String,
}

#[tauri::command]
pub async fn run_workspace_command(
    command: String,
    args: Vec<String>,
    state: State<'_, DesktopState>,
) -> DesktopResult<TerminalResult> {
    if !ALLOWED_COMMANDS.contains(&command.as_str()) {
        return Err(DesktopError::Policy(format!(
            "Command '{command}' is not allowed."
        )));
    }
    let root = workspace_root(&state)?;
    let output = background_command(&command)
        .args(args)
        .current_dir(root)
        .output()?;
    Ok(TerminalResult {
        code: output.status.code(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
    })
}
