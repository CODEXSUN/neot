use std::process::Command;

use serde::Serialize;
use tauri::State;

use crate::commands::{background_command, workspace_path, workspace_root};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalEditor {
    id: &'static str,
    label: &'static str,
}

struct EditorDefinition {
    id: &'static str,
    label: &'static str,
    command: &'static str,
}

const EDITORS: &[EditorDefinition] = &[
    EditorDefinition {
        id: "vscode",
        label: "Visual Studio Code",
        command: "code.cmd",
    },
    EditorDefinition {
        id: "cursor",
        label: "Cursor",
        command: "cursor.cmd",
    },
    EditorDefinition {
        id: "windsurf",
        label: "Windsurf",
        command: "windsurf.cmd",
    },
    EditorDefinition {
        id: "idea",
        label: "JetBrains IDE",
        command: "idea64.exe",
    },
    EditorDefinition {
        id: "zed",
        label: "Zed",
        command: "zed.exe",
    },
];

#[tauri::command]
pub fn list_external_editors() -> Vec<ExternalEditor> {
    let mut editors = EDITORS
        .iter()
        .filter(|editor| command_exists(editor.command))
        .map(|editor| ExternalEditor {
            id: editor.id,
            label: editor.label,
        })
        .collect::<Vec<_>>();
    editors.push(ExternalEditor {
        id: "explorer",
        label: "File Explorer",
    });
    editors.push(ExternalEditor {
        id: "terminal",
        label: "Windows Terminal",
    });
    editors
}

#[tauri::command]
pub fn open_in_external_editor(
    editor_id: String,
    path: Option<String>,
    state: State<'_, DesktopState>,
) -> DesktopResult<()> {
    let target = match path {
        Some(relative) => workspace_path(&state, &relative)?,
        None => workspace_root(&state)?,
    };
    let mut command = match editor_id.as_str() {
        "explorer" => Command::new("explorer.exe"),
        "terminal" => {
            let mut command = Command::new("wt.exe");
            command.args(["-d", target.to_string_lossy().as_ref()]);
            command.spawn()?;
            return Ok(());
        }
        id => {
            let editor = EDITORS
                .iter()
                .find(|editor| editor.id == id)
                .ok_or_else(|| DesktopError::Policy("Unknown external editor.".into()))?;
            if !command_exists(editor.command) {
                return Err(DesktopError::Policy(format!(
                    "{} is not installed or available on PATH.",
                    editor.label
                )));
            }
            Command::new(editor.command)
        }
    };
    command.arg(target).spawn()?;
    Ok(())
}

fn command_exists(command: &str) -> bool {
    background_command("where.exe")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
