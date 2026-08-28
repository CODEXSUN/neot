use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::State;

use crate::commands::{background_command, workspace_root};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

const PROJECT_FILES: &[&str] = &[
    "pyproject.toml",
    "requirements.txt",
    "uv.lock",
    "Pipfile",
    "environment.yml",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PythonEnvironment {
    available: bool,
    configured: bool,
    gpu_tools: bool,
    interpreter: Option<String>,
    project_files: Vec<String>,
    version: Option<String>,
    virtual_environment: Option<String>,
}

#[tauri::command]
pub fn python_environment_status(
    state: State<'_, DesktopState>,
) -> DesktopResult<PythonEnvironment> {
    let root = workspace_root(&state)?;
    Ok(environment_status(&root))
}

#[tauri::command]
pub async fn create_python_environment(
    state: State<'_, DesktopState>,
) -> DesktopResult<PythonEnvironment> {
    let root = workspace_root(&state)?;
    let target = root.join(".venv");
    if target.exists() {
        return Err(DesktopError::Policy(
            "The workspace already contains a .venv directory.".into(),
        ));
    }
    let mut command = tokio::process::Command::new("python");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.as_std_mut().creation_flags(0x08000000);
    }
    let output = command
        .args(["-m", "venv", ".venv"])
        .current_dir(&root)
        .output()
        .await?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(DesktopError::Policy(if message.is_empty() {
            "Python could not create the virtual environment.".into()
        } else {
            message
        }));
    }
    Ok(environment_status(&root))
}

fn environment_status(root: &Path) -> PythonEnvironment {
    let virtual_python = virtual_python_path(root);
    let interpreter = virtual_python
        .exists()
        .then_some(virtual_python)
        .or_else(|| command_path("python"));
    let version = interpreter.as_ref().and_then(|path| command_version(path));
    let project_files = PROJECT_FILES
        .iter()
        .filter(|name| root.join(name).is_file())
        .map(|name| (*name).to_owned())
        .collect::<Vec<_>>();
    PythonEnvironment {
        available: interpreter.is_some(),
        configured: virtual_python_path(root).is_file(),
        gpu_tools: command_path("nvidia-smi").is_some(),
        interpreter: interpreter.as_ref().map(|path| path.display().to_string()),
        project_files,
        version,
        virtual_environment: virtual_python_path(root)
            .is_file()
            .then(|| root.join(".venv").display().to_string()),
    }
}

fn virtual_python_path(root: &Path) -> PathBuf {
    if cfg!(windows) {
        root.join(".venv/Scripts/python.exe")
    } else {
        root.join(".venv/bin/python")
    }
}

fn command_path(command: &str) -> Option<PathBuf> {
    let lookup = if cfg!(windows) { "where" } else { "which" };
    let output = background_command(lookup).arg(command).output().ok()?;
    output
        .status
        .success()
        .then(|| {
            String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .map(PathBuf::from)
        })
        .flatten()
}

fn command_version(command: &Path) -> Option<String> {
    let output = background_command(command).arg("--version").output().ok()?;
    output.status.success().then(|| {
        let value = if output.stdout.is_empty() {
            &output.stderr
        } else {
            &output.stdout
        };
        String::from_utf8_lossy(value).trim().to_owned()
    })
}

#[cfg(test)]
mod tests {
    use super::virtual_python_path;
    use std::path::Path;

    #[test]
    fn keeps_the_virtual_environment_inside_the_workspace() {
        let root = Path::new("workspace");
        assert!(virtual_python_path(root).starts_with(root));
    }
}
