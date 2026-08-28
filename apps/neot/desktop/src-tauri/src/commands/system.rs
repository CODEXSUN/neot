use serde::Serialize;

use super::background_command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatus {
    docker: bool,
    git: bool,
    platform: String,
    rust_version: String,
    node: bool,
    python: bool,
    ripgrep: bool,
    wsl: bool,
}

#[tauri::command]
pub fn system_status() -> SystemStatus {
    SystemStatus {
        docker: available("docker"),
        git: available("git"),
        platform: std::env::consts::OS.to_owned(),
        rust_version: option_env!("RUSTC_VERSION")
            .unwrap_or("compiled")
            .to_owned(),
        node: available("node"),
        python: available("python"),
        ripgrep: available("rg"),
        wsl: available("wsl"),
    }
}

fn available(command: &str) -> bool {
    background_command(command)
        .arg("--version")
        .output()
        .is_ok_and(|value| value.status.success())
}
