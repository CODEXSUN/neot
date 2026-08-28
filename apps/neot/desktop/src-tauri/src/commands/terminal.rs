use std::env;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::thread;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::commands::workspace_root;
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalOutput {
    session_id: String,
    data: String,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TerminalShell {
    GitBash,
    Powershell,
}

#[tauri::command]
pub fn start_terminal(
    app: AppHandle,
    shell: TerminalShell,
    state: State<'_, DesktopState>,
) -> DesktopResult<String> {
    let root = workspace_root(&state)?;
    let pair = native_pty_system()
        .openpty(PtySize {
            rows: 24,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| DesktopError::Policy(format!("Terminal creation failed: {error}")))?;
    let mut command = terminal_command(shell)?;
    command.cwd(root);
    pair.slave
        .spawn_command(command)
        .map_err(|error| DesktopError::Policy(format!("Terminal start failed: {error}")))?;
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| DesktopError::Policy(format!("Terminal reader failed: {error}")))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|error| DesktopError::Policy(format!("Terminal writer failed: {error}")))?;
    let session_id = Uuid::new_v4().to_string();
    state
        .terminals
        .lock()
        .map_err(|_| DesktopError::Policy("Terminal state is unavailable.".into()))?
        .insert(session_id.clone(), writer);
    let output_session = session_id.clone();
    thread::spawn(move || {
        let mut buffer = [0_u8; 4096];
        while let Ok(count) = reader.read(&mut buffer) {
            if count == 0 {
                break;
            }
            let _ = app.emit(
                "terminal-output",
                TerminalOutput {
                    session_id: output_session.clone(),
                    data: String::from_utf8_lossy(&buffer[..count]).into_owned(),
                },
            );
        }
    });
    Ok(session_id)
}

fn terminal_command(shell: TerminalShell) -> DesktopResult<CommandBuilder> {
    match shell {
        TerminalShell::Powershell => {
            let mut command = CommandBuilder::new(if cfg!(windows) {
                "powershell.exe"
            } else {
                "sh"
            });
            if cfg!(windows) {
                command.args([
                    "-NoLogo",
                    "-NoProfile",
                    "-NoExit",
                    "-Command",
                    "Write-Host 'NEOT PowerShell terminal connected.'",
                ]);
            } else {
                command.arg("-i");
            }
            Ok(command)
        }
        TerminalShell::GitBash => {
            if !cfg!(windows) {
                return Err(DesktopError::Policy(
                    "Git Bash is available only on Windows.".into(),
                ));
            }
            let executable = git_bash_path().ok_or_else(|| {
                DesktopError::Policy(
                    "Git Bash was not found. Install Git for Windows or use PowerShell.".into(),
                )
            })?;
            let mut command = CommandBuilder::new(executable);
            command.args(["--login", "-i"]);
            command.env("CHERE_INVOKING", "1");
            command.env("MSYSTEM", "MINGW64");
            Ok(command)
        }
    }
}

fn git_bash_path() -> Option<PathBuf> {
    let mut candidates = ["ProgramFiles", "ProgramW6432", "ProgramFiles(x86)"]
        .into_iter()
        .filter_map(env::var_os)
        .map(PathBuf::from)
        .map(|root| root.join("Git").join("bin").join("bash.exe"))
        .collect::<Vec<_>>();
    if let Some(local) = env::var_os("LOCALAPPDATA") {
        candidates.push(
            PathBuf::from(local)
                .join("Programs")
                .join("Git")
                .join("bin")
                .join("bash.exe"),
        );
    }
    candidates.into_iter().find(|path| path.is_file())
}

#[tauri::command]
pub fn write_terminal(
    session_id: String,
    data: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<()> {
    let mut terminals = state
        .terminals
        .lock()
        .map_err(|_| DesktopError::Policy("Terminal state is unavailable.".into()))?;
    let writer = terminals
        .get_mut(&session_id)
        .ok_or_else(|| DesktopError::Policy("Terminal session was not found.".into()))?;
    writer.write_all(data.as_bytes())?;
    writer.flush()?;
    Ok(())
}

#[tauri::command]
pub fn close_terminal(session_id: String, state: State<'_, DesktopState>) -> DesktopResult<()> {
    state
        .terminals
        .lock()
        .map_err(|_| DesktopError::Policy("Terminal state is unavailable.".into()))?
        .remove(&session_id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::TerminalShell;

    #[test]
    fn accepts_frontend_shell_identifiers() {
        assert!(matches!(
            serde_json::from_str::<TerminalShell>("\"gitBash\"").unwrap(),
            TerminalShell::GitBash
        ));
        assert!(matches!(
            serde_json::from_str::<TerminalShell>("\"powershell\"").unwrap(),
            TerminalShell::Powershell
        ));
    }
}
