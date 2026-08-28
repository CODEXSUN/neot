use std::fs;

use serde::Serialize;
use tauri::State;

use crate::commands::workspace_root;
use crate::error::DesktopResult;
use crate::state::DesktopState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSkill {
    id: String,
    path: String,
    source: String,
}

#[tauri::command]
pub fn list_project_skills(state: State<'_, DesktopState>) -> DesktopResult<Vec<ProjectSkill>> {
    let root = workspace_root(&state)?;
    let candidates = [
        (root.join(".neot/skills"), "project"),
        (root.join("assist/skills/library"), "repository"),
    ];
    let mut skills = Vec::new();
    for (directory, source) in candidates {
        let Ok(entries) = fs::read_dir(directory) else {
            continue;
        };
        for entry in entries
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_dir())
        {
            let manifest = entry.path().join("SKILL.md");
            if manifest.is_file() {
                skills.push(ProjectSkill {
                    id: entry.file_name().to_string_lossy().into_owned(),
                    path: manifest
                        .strip_prefix(&root)
                        .unwrap_or(&manifest)
                        .display()
                        .to_string(),
                    source: source.to_owned(),
                });
            }
        }
    }
    skills.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(skills)
}
