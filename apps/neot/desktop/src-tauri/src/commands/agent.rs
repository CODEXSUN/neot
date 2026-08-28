use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

use crate::commands::workspace_root;
use crate::error::{DesktopError, DesktopResult};
use crate::state::{AgentRuntime, DesktopState};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRuntimeStatus {
    connected: bool,
    executable: String,
}

#[tauri::command]
pub fn start_agent_runtime(
    app: AppHandle,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentRuntimeStatus> {
    let mut runtime = state
        .agent
        .lock()
        .map_err(|_| DesktopError::Policy("Agent runtime state is unavailable.".into()))?;

    if let Some(active) = runtime.as_mut() {
        if active.child.try_wait()?.is_none() {
            return Ok(AgentRuntimeStatus {
                connected: true,
                executable: active.executable.clone(),
            });
        }
        *runtime = None;
    }

    let executable = resolve_codex_executable();
    let mut command = Command::new(&executable);
    command
        .arg("app-server")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    prepend_runtime_directory_to_path(&mut command, &executable)?;
    hide_child_window(&mut command);

    let mut child = command.spawn().map_err(|error| {
        DesktopError::Policy(format!(
            "NEOT could not start its Codex engine. Set NEOT_CODEX_BIN to override it. {error}"
        ))
    })?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| DesktopError::Policy("Codex stdout is unavailable.".into()))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| DesktopError::Policy("Codex stderr is unavailable.".into()))?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| DesktopError::Policy("Codex stdin is unavailable.".into()))?;

    emit_lines(app.clone(), stdout, "agent-event");
    emit_lines(app, stderr, "agent-error");
    let mut active = AgentRuntime::new(child, stdin, executable.clone());
    active.send(
        1,
        "initialize",
        json!({
            "clientInfo": {
                "name": "neot_desktop",
                "title": "NEOT",
                "version": env!("CARGO_PKG_VERSION")
            }
        }),
    )?;
    active.notify("initialized", json!({}))?;
    *runtime = Some(active);

    Ok(AgentRuntimeStatus {
        connected: true,
        executable,
    })
}

fn prepend_runtime_directory_to_path(command: &mut Command, executable: &str) -> DesktopResult<()> {
    let Some(directory) = Path::new(executable).parent() else {
        return Ok(());
    };
    if directory.as_os_str().is_empty() {
        return Ok(());
    }

    let path = std::env::var_os("PATH").unwrap_or_default();
    let paths = std::iter::once(directory.to_path_buf()).chain(std::env::split_paths(&path));
    let path = std::env::join_paths(paths).map_err(|error| {
        DesktopError::Policy(format!(
            "NEOT could not prepare the Codex runtime path. {error}"
        ))
    })?;
    command.env("PATH", path);
    Ok(())
}

fn resolve_codex_executable() -> String {
    if let Ok(path) = std::env::var("NEOT_CODEX_BIN") {
        return path;
    }
    if let Ok(path) = std::env::var("CODELOGIX_CODEX_BIN") {
        return path;
    }

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(directory) = current_exe.parent() {
            let bundled = directory.join(codex_binary_name());
            if bundled.is_file() {
                return bundled.to_string_lossy().into_owned();
            }
        }
    }

    development_codex_executable()
        .filter(|path| path.is_file())
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_else(|| "codex".into())
}

fn development_codex_executable() -> Option<PathBuf> {
    let repository_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("..")
        .join("..");
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return Some(
        repository_root.join(
            "node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe",
        ),
    );
    #[cfg(all(target_os = "windows", target_arch = "aarch64"))]
    return Some(repository_root.join(
        "node_modules/@openai/codex-win32-arm64/vendor/aarch64-pc-windows-msvc/bin/codex.exe",
    ));
    #[cfg(not(target_os = "windows"))]
    None
}

#[cfg(windows)]
fn codex_binary_name() -> &'static str {
    "codex.exe"
}

#[cfg(not(windows))]
fn codex_binary_name() -> &'static str {
    "codex"
}

#[tauri::command]
pub fn start_agent_thread(state: State<'_, DesktopState>) -> DesktopResult<u64> {
    let root = workspace_root(&state)?;
    let (model, reasoning_effort) = state.with_database(|database| {
        let config = database.get_agent_config()?;
        if config.default_provider != "codex" {
            return Err(DesktopError::Policy(format!(
                "{} is selected, but its execution adapter is not configured. Select Codex or configure the provider bridge first.",
                config.default_provider
            )));
        }
        Ok((config.default_provider == "codex")
            .then(|| {
                let provider = config.providers.get("codex");
                (
                    provider
                        .and_then(|item| item.model.clone())
                        .map(normalize_codex_model)
                        .unwrap_or_else(|| "gpt-5.6-terra".into()),
                    provider
                        .and_then(|item| item.reasoning_effort.clone())
                        .unwrap_or_else(|| "low".into()),
                )
            })
            .unzip())
    })?;
    send_request(
        &state,
        "thread/start",
        json!({
            "cwd": root,
            "model": model,
            "config": reasoning_effort.map(|value| json!({ "model_reasoning_effort": value })),
            "approvalPolicy": "on-request",
            "sandbox": "workspace-write",
            "serviceName": "neot_desktop"
        }),
    )
}

fn normalize_codex_model(model: String) -> String {
    if model == "gpt-5.6-sol" {
        "gpt-5.6-terra".into()
    } else {
        model
    }
}

#[tauri::command]
pub fn run_opencode_task(
    task_id: i64,
    model: String,
    prompt: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<String> {
    if model != "opencode/nemotron-3-ultra-free" {
        return Err(DesktopError::Policy("OpenCode Project Tasks currently support Nematron 3 Ultra Free only.".into()));
    }
    if prompt.trim().is_empty() {
        return Err(DesktopError::Policy("Enter an instruction for the OpenCode task.".into()));
    }

    let root = task_execution_root(&state, task_id)?;
    let executable = std::env::var("NEOT_OPENCODE_BIN").unwrap_or_else(|_| "opencode".into());
    let output = Command::new(&executable)
        .arg("run")
        .arg("--model")
        .arg(model)
        .arg(prompt.trim())
        .current_dir(root)
        .env("OPENCODE_DISABLE_AUTOUPDATE", "true")
        .output()
        .map_err(|error| DesktopError::Policy(format!("NEOT could not start OpenCode. Install opencode-ai or set NEOT_OPENCODE_BIN. {error}")))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    if !output.status.success() {
        return Err(DesktopError::Policy(if stderr.is_empty() { "OpenCode exited without a result.".into() } else { stderr }));
    }
    if stdout.is_empty() {
        return Err(DesktopError::Policy("OpenCode completed without a final text response.".into()));
    }
    Ok(stdout)
}

#[tauri::command]
pub fn resume_agent_thread(
    task_id: i64,
    thread_id: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<u64> {
    if thread_id.trim().is_empty() {
        return Err(DesktopError::Policy("Codex thread is required.".into()));
    }
    let root = task_execution_root(&state, task_id)?;
    send_request(
        &state,
        "thread/resume",
        json!({
            "threadId": thread_id,
            "cwd": root,
            "approvalPolicy": "on-request"
        }),
    )
}

#[tauri::command]
pub fn send_agent_turn(
    task_id: i64,
    thread_id: String,
    prompt: String,
    access: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<u64> {
    if prompt.trim().is_empty() {
        return Err(DesktopError::Policy(
            "Enter an instruction for the agent.".into(),
        ));
    }
    let root = task_execution_root(&state, task_id)?;
    let sandbox = if access == "readOnly" {
        json!({ "type": "readOnly" })
    } else {
        json!({
            "type": "workspaceWrite",
            "writableRoots": [root.clone()],
            "networkAccess": false
        })
    };

    send_request(
        &state,
        "turn/start",
        json!({
            "threadId": thread_id,
            "input": [{ "type": "text", "text": prompt.trim() }],
            "cwd": root,
            "approvalPolicy": "on-request",
            "sandboxPolicy": sandbox
        }),
    )
}

fn task_execution_root(state: &State<'_, DesktopState>, task_id: i64) -> DesktopResult<PathBuf> {
    let workspace = workspace_root(state)?;
    let workspace_path = workspace.to_string_lossy().into_owned();
    let configured_path = state
        .with_database(|database| database.agent_task_execution_path(&workspace_path, task_id))?;
    let root = PathBuf::from(configured_path).canonicalize()?;
    if root == workspace {
        return Ok(root);
    }
    let parent = workspace
        .parent()
        .ok_or_else(|| DesktopError::Policy("The workspace has no parent directory.".into()))?;
    let managed_root = parent.join(".neot-worktrees").canonicalize()?;
    if !root.starts_with(&managed_root) {
        return Err(DesktopError::Policy(
            "The task execution path is outside its managed worktree root.".into(),
        ));
    }
    Ok(root)
}

#[tauri::command]
pub fn interrupt_agent_turn(
    thread_id: String,
    turn_id: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<u64> {
    send_request(
        &state,
        "turn/interrupt",
        json!({ "threadId": thread_id, "turnId": turn_id }),
    )
}

#[tauri::command]
pub fn answer_agent_approval(
    request_id: u64,
    decision: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<()> {
    let allowed = ["accept", "acceptForSession", "decline", "cancel"];
    if !allowed.contains(&decision.as_str()) {
        return Err(DesktopError::Policy("Unknown approval decision.".into()));
    }
    with_runtime(&state, |runtime| {
        runtime.respond(request_id, json!({ "decision": decision }))
    })
}

fn send_request(
    state: &State<'_, DesktopState>,
    method: &str,
    params: Value,
) -> DesktopResult<u64> {
    with_runtime(state, |runtime| {
        let id = runtime.next_request_id();
        runtime.send(id, method, params)?;
        Ok(id)
    })
}

fn with_runtime<T>(
    state: &State<'_, DesktopState>,
    action: impl FnOnce(&mut AgentRuntime) -> DesktopResult<T>,
) -> DesktopResult<T> {
    let mut runtime = state
        .agent
        .lock()
        .map_err(|_| DesktopError::Policy("Agent runtime state is unavailable.".into()))?;
    let active = runtime
        .as_mut()
        .ok_or_else(|| DesktopError::Policy("Start the Codex agent runtime first.".into()))?;
    action(active)
}

fn emit_lines(app: AppHandle, stream: impl std::io::Read + Send + 'static, event: &'static str) {
    thread::spawn(move || {
        for line in BufReader::new(stream).lines().map_while(Result::ok) {
            let payload = serde_json::from_str::<Value>(&line).unwrap_or_else(
                |_| json!({ "method": "runtime/log", "params": { "message": line } }),
            );
            let _ = app.emit(event, payload);
        }
    });
}

#[cfg(windows)]
fn hide_child_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x08000000);
}

#[cfg(not(windows))]
fn hide_child_window(_command: &mut Command) {}

impl AgentRuntime {
    fn send(&mut self, id: u64, method: &str, params: Value) -> DesktopResult<()> {
        self.write(&json!({ "method": method, "id": id, "params": params }))
    }

    fn notify(&mut self, method: &str, params: Value) -> DesktopResult<()> {
        self.write(&json!({ "method": method, "params": params }))
    }

    fn respond(&mut self, id: u64, result: Value) -> DesktopResult<()> {
        self.write(&json!({ "id": id, "result": result }))
    }

    fn write(&mut self, message: &Value) -> DesktopResult<()> {
        serde_json::to_writer(&mut self.stdin, message).map_err(|error| {
            DesktopError::Policy(format!("Codex message serialization failed: {error}"))
        })?;
        self.stdin.write_all(b"\n")?;
        self.stdin.flush()?;
        Ok(())
    }
}
