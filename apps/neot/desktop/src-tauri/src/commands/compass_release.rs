use std::io::{BufRead, BufReader, Read};
use std::path::PathBuf;
use std::process::{Child, Stdio};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

use super::{background_command, workspace_root};

const RELEASE_ACTIONS: &[&str] = &[
    "inspect",
    "validate",
    "version-bump",
    "commit-push",
    "publish-release",
];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompassReleaseEvent {
    pub kind: String,
    pub message: String,
    pub data: Option<Value>,
}

#[tauri::command]
pub async fn run_compass_release_step(
    action: String,
    title: Option<String>,
    message: Option<String>,
    app: AppHandle,
    state: State<'_, DesktopState>,
) -> DesktopResult<Vec<CompassReleaseEvent>> {
    let action = action.trim().to_owned();
    if !RELEASE_ACTIONS.contains(&action.as_str()) {
        return Err(DesktopError::Policy("Unknown Compass release step.".into()));
    }

    let root = workspace_root(&state)?;
    let script = root.join("tools").join("compass-release-worker.mjs");
    if !script.is_file() {
        return Err(DesktopError::Policy(
            "Compass release worker is unavailable in this workspace.".into(),
        ));
    }

    tauri::async_runtime::spawn_blocking(move || {
        run_release_worker(root, script, action, title, message, app)
    })
    .await
    .map_err(|error| DesktopError::Policy(format!("Compass release worker stopped unexpectedly: {error}")))?
}

fn run_release_worker(
    root: PathBuf,
    script: PathBuf,
    action: String,
    title: Option<String>,
    message: Option<String>,
    app: AppHandle,
) -> DesktopResult<Vec<CompassReleaseEvent>> {
    let mut command = background_command("node");
    command
        .current_dir(root)
        .arg(script)
        .arg(action)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(value) = title.filter(|value| !value.trim().is_empty()) {
        command.arg("--title").arg(value.trim());
    }
    if let Some(value) = message.filter(|value| !value.trim().is_empty()) {
        command.arg("--message").arg(value.trim());
    }

    collect_worker_output(command.spawn()?, app)
}

fn collect_worker_output(mut child: Child, app: AppHandle) -> DesktopResult<Vec<CompassReleaseEvent>> {
    let stdout = child.stdout.take().ok_or_else(|| {
        DesktopError::Policy("Compass worker output is unavailable.".into())
    })?;
    let stderr = child.stderr.take().ok_or_else(|| {
        DesktopError::Policy("Compass worker diagnostics are unavailable.".into())
    })?;
    let event_reader = std::thread::spawn(move || read_events(stdout, app));
    let diagnostic_reader = std::thread::spawn(move || read_diagnostics(stderr));

    let status = child.wait()?;
    let events = event_reader
        .join()
        .map_err(|_| DesktopError::Policy("Compass worker event reader stopped unexpectedly.".into()))??;
    let diagnostics = diagnostic_reader
        .join()
        .map_err(|_| DesktopError::Policy("Compass worker diagnostic reader stopped unexpectedly.".into()))??;

    if !status.success() {
        return Err(DesktopError::Policy(worker_failure_message(&events, diagnostics)));
    }
    Ok(events)
}

fn read_events(stdout: impl Read, app: AppHandle) -> DesktopResult<Vec<CompassReleaseEvent>> {
    let mut events = Vec::new();
    for line in BufReader::new(stdout).lines() {
        let line = line?;
        let event = serde_json::from_str::<WorkerEvent>(&line)
            .map_err(|_| DesktopError::Policy("Compass worker emitted invalid output.".into()))?
            .into_event();
        let _ = app.emit("compass-release-event", &event);
        events.push(event);
    }
    Ok(events)
}

fn read_diagnostics(stderr: impl Read) -> DesktopResult<String> {
    let mut diagnostics = String::new();
    BufReader::new(stderr).read_to_string(&mut diagnostics)?;
    Ok(diagnostics.trim().to_owned())
}

fn worker_failure_message(events: &[CompassReleaseEvent], diagnostics: String) -> String {
    if !diagnostics.is_empty() {
        return diagnostics;
    }
    events
        .iter()
        .rev()
        .find(|event| event.kind == "error")
        .map(|event| event.message.clone())
        .unwrap_or_else(|| "Compass release worker failed.".into())
}

#[derive(Deserialize)]
struct WorkerEvent {
    #[serde(rename = "type")]
    kind: String,
    message: String,
    data: Option<Value>,
}

impl WorkerEvent {
    fn into_event(self) -> CompassReleaseEvent {
        CompassReleaseEvent {
            kind: self.kind,
            message: self.message,
            data: self.data,
        }
    }
}
