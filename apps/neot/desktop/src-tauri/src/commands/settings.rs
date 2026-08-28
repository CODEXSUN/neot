use crate::database::{AgentConfig, DesktopProfile, DesktopSetup, DesktopWorkspace};
use crate::error::{DesktopError, DesktopResult};
use crate::database::{ProjectIdea, ProjectIdeaDiscussion};
use crate::state::DesktopState;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfigResponse {
    config: AgentConfig,
}

#[tauri::command]
pub fn get_agent_config(state: State<'_, DesktopState>) -> DesktopResult<AgentConfigResponse> {
    state.with_database(|database| {
        let config = database.get_agent_config()?;
        Ok(AgentConfigResponse { config })
    })
}

#[tauri::command]
pub fn get_desktop_setup(state: State<'_, DesktopState>) -> DesktopResult<DesktopSetup> {
    state.with_database(|database| database.desktop_setup())
}

#[tauri::command]
pub fn save_desktop_profile(
    profile: DesktopProfile,
    state: State<'_, DesktopState>,
) -> DesktopResult<DesktopProfile> {
    let display_name = profile.display_name.trim();
    if display_name.is_empty() || display_name.len() > 80 {
        return Err(DesktopError::Policy(
            "Enter a display name of up to 80 characters.".into(),
        ));
    }
    let email = profile
        .email
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if email.is_some_and(|value| value.len() > 254 || !value.contains('@')) {
        return Err(DesktopError::Policy(
            "Enter a valid email address or leave it blank.".into(),
        ));
    }
    state.with_database(|database| {
        database.save_desktop_profile(&DesktopProfile {
            display_name: display_name.into(),
            email: email.map(str::to_owned),
            ..profile
        })
    })
}

#[tauri::command]
pub fn save_desktop_workspace(
    workspace: DesktopWorkspace,
    state: State<'_, DesktopState>,
) -> DesktopResult<DesktopWorkspace> {
    let valid_kinds = ["application", "plugin", "document", "other"];
    let valid_relationships = ["project", "addOn", "standalone"];
    if !valid_kinds.contains(&workspace.kind.as_str())
        || !valid_relationships.contains(&workspace.relationship.as_str())
    {
        return Err(DesktopError::Policy("Invalid workspace mapping.".into()));
    }
    state.with_database(|database| database.save_desktop_workspace(&workspace))
}

#[tauri::command]
pub fn set_desktop_workspace_pinned(
    path: String,
    pinned: bool,
    state: State<'_, DesktopState>,
) -> DesktopResult<DesktopWorkspace> {
    if path.trim().is_empty() {
        return Err(DesktopError::Policy("Workspace path is required.".into()));
    }
    state.with_database(|database| database.set_desktop_workspace_pinned(&path, pinned))
}

#[tauri::command]
pub fn save_desktop_project_details(
    workspace: DesktopWorkspace,
    state: State<'_, DesktopState>,
) -> DesktopResult<DesktopWorkspace> {
    validate_project_details(&workspace)?;
    state.with_database(|database| database.save_desktop_project_details(&workspace))
}

#[tauri::command]
pub fn list_desktop_project_ideas(path: String, state: State<'_, DesktopState>) -> DesktopResult<Vec<ProjectIdea>> {
    state.with_database(|database| database.list_project_ideas(path.trim()))
}

#[tauri::command]
pub fn save_desktop_project_idea(path: String, title: String, context: String, discussion: String, state: State<'_, DesktopState>) -> DesktopResult<ProjectIdea> {
    let title = title.trim();
    if title.is_empty() || title.len() > 180 { return Err(DesktopError::Policy("Idea title must be between 1 and 180 characters.".into())); }
    if context.len() > 4_000 || discussion.len() > 4_000 { return Err(DesktopError::Policy("Idea notes must be at most 4,000 characters.".into())); }
    state.with_database(|database| database.save_project_idea(path.trim(), title, context.trim(), discussion.trim()))
}

#[tauri::command]
pub fn convert_desktop_project_idea(path: String, idea_id: i64, state: State<'_, DesktopState>) -> DesktopResult<ProjectIdea> {
    state.with_database(|database| database.convert_project_idea(path.trim(), idea_id))
}

#[tauri::command]
pub fn list_desktop_project_idea_discussions(path: String, idea_id: i64, state: State<'_, DesktopState>) -> DesktopResult<Vec<ProjectIdeaDiscussion>> {
    state.with_database(|database| database.list_project_idea_discussions(path.trim(), idea_id))
}

#[tauri::command]
pub fn save_desktop_project_idea_discussion(path: String, idea_id: i64, content: String, state: State<'_, DesktopState>) -> DesktopResult<ProjectIdeaDiscussion> {
    let content = content.trim();
    if content.is_empty() || content.len() > 4_000 { return Err(DesktopError::Policy("Discussion entry must be between 1 and 4,000 characters.".into())); }
    state.with_database(|database| database.save_project_idea_discussion(path.trim(), idea_id, content))
}

#[tauri::command]
pub fn read_desktop_project_changelog(
    path: String,
    changelog_path: Option<String>,
    state: State<'_, DesktopState>,
) -> DesktopResult<String> {
    let path = path.trim();
    if path.is_empty() {
        return Err(DesktopError::Policy("Project path is required.".to_owned()));
    }

    let workspace = state.with_database(|database| database.desktop_workspace(path))?;
    let root = PathBuf::from(workspace.path);
    if !root.is_dir() {
        return Err(DesktopError::Policy(
            "This registered project folder is unavailable.".to_owned(),
        ));
    }

    let configured = changelog_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let names = configured.map(|value| vec![value]).unwrap_or_else(|| vec![
        "assist/documentation/changelog.md",
        "assist/documentation/CHANGELOG.md",
        "CHANGELOG.mdx",
        "CHANGELOG.md",
        "Changelog.md",
        "changelog.md",
    ]);
    for name in names {
        if std::path::Path::new(name).is_absolute() || name.contains("..") {
            return Err(DesktopError::Policy("Choose a changelog file inside this project.".to_owned()));
        }
        let candidate = root.join(name);
        if candidate.is_file() {
            let content = fs::read_to_string(candidate)?;
            if content.len() > 1_000_000 {
                return Err(DesktopError::Policy(
                    "The changelog is too large to preview.".to_owned(),
                ));
            }
            return Ok(content);
        }
    }

    Err(DesktopError::Policy(
        "No default assist/documentation/changelog.md, CHANGELOG.md, or CHANGELOG.mdx file was found for this registered project.".to_owned(),
    ))
}

#[tauri::command]
pub fn choose_desktop_project_changelog(
    path: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<Option<String>> {
    let workspace = state.with_database(|database| database.desktop_workspace(path.trim()))?;
    let root = PathBuf::from(workspace.path);
    let root = root.canonicalize()?;
    let selected = rfd::FileDialog::new()
        .set_directory(&root)
        .add_filter("Changelog", &["md", "mdx"])
        .pick_file();
    let Some(selected) = selected else { return Ok(None); };
    let selected = selected.canonicalize()?;
    let relative = selected.strip_prefix(&root).map_err(|_| {
        DesktopError::Policy("Choose a changelog file inside this project.".to_owned())
    })?;
    Ok(Some(relative.to_string_lossy().replace('\\', "/")))
}

#[tauri::command]
pub fn set_default_desktop_workspace(
    path: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<String> {
    if path.trim().is_empty() {
        return Err(DesktopError::Policy("Workspace path is required.".into()));
    }
    state.with_database(|database| database.set_default_desktop_workspace(&path))
}

#[tauri::command]
pub fn clear_default_desktop_workspace(state: State<'_, DesktopState>) -> DesktopResult<()> {
    state.with_database(|database| database.clear_default_desktop_workspace())
}

fn validate_project_details(workspace: &DesktopWorkspace) -> DesktopResult<()> {
    if workspace.path.trim().is_empty() {
        return Err(DesktopError::Policy("Workspace path is required.".into()));
    }
    for (label, value, maximum) in [
        ("Project tagline", workspace.tagline.as_deref(), 280),
        ("Project owner", workspace.owner_name.as_deref(), 120),
        ("Project type", workspace.project_type.as_deref(), 80),
        ("Changelog path", workspace.changelog_path.as_deref(), 400),
    ] {
        if value.is_some_and(|item| item.trim().len() > maximum) {
            return Err(DesktopError::Policy(format!("{label} must be at most {maximum} characters.")));
        }
    }
    for (label, value) in [("Start date", workspace.started_on.as_deref()), ("Due date", workspace.due_on.as_deref())] {
        if value.is_some_and(|item| !is_iso_date(item)) {
            return Err(DesktopError::Policy(format!("{label} must use YYYY-MM-DD.")));
        }
    }
    if !["low", "normal", "high", "critical"].contains(&workspace.priority.as_str()) {
        return Err(DesktopError::Policy("Invalid project priority.".into()));
    }
    if workspace.project_id.is_some_and(|value| value < 1) {
        return Err(DesktopError::Policy("Project ID must be a positive integer.".into()));
    }
    Ok(())
}

fn is_iso_date(value: &str) -> bool {
    let value = value.trim();
    value.len() == 10
        && value.as_bytes().get(4) == Some(&b'-')
        && value.as_bytes().get(7) == Some(&b'-')
        && value.chars().enumerate().all(|(index, character)| {
            matches!(index, 4 | 7) || character.is_ascii_digit()
        })
}

#[tauri::command]
pub fn remove_desktop_workspace(
    path: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<bool> {
    if path.trim().is_empty() {
        return Err(DesktopError::Policy("Workspace path is required.".into()));
    }
    state.with_database(|database| database.remove_desktop_workspace(&path))
}

#[tauri::command]
pub fn reset_desktop_work_group(state: State<'_, DesktopState>) -> DesktopResult<DesktopProfile> {
    state.with_database(|database| database.reset_default_work_group())
}

#[tauri::command]
pub fn save_agent_config(
    config: AgentConfig,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentConfigResponse> {
    if config.max_turns < 1 || config.max_turns > 200 {
        return Err(DesktopError::Policy(
            "Max turns must be between 1 and 200.".into(),
        ));
    }
    if config.idle_timeout < 30 || config.idle_timeout > 600 {
        return Err(DesktopError::Policy(
            "Idle timeout must be between 30 and 600 seconds.".into(),
        ));
    }
    let allowed_access = ["readOnly", "workspaceWrite"];
    if !allowed_access.contains(&config.default_access.as_str()) {
        return Err(DesktopError::Policy("Invalid default access value.".into()));
    }
    let allowed_approval = ["on-request", "never", "always"];
    if !allowed_approval.contains(&config.approval_policy.as_str()) {
        return Err(DesktopError::Policy("Invalid approval policy.".into()));
    }
    let allowed_sandbox = ["workspace-write", "read-only", "danger-full-access"];
    if !allowed_sandbox.contains(&config.sandbox_type.as_str()) {
        return Err(DesktopError::Policy("Invalid sandbox type.".into()));
    }
    let allowed_providers = [
        "codex",
        "openrouter",
        "opencode",
        "claude",
        "ollama",
        "gemini",
    ];
    if !allowed_providers.contains(&config.default_provider.as_str()) {
        return Err(DesktopError::Policy("Invalid default provider.".into()));
    }
    if !config.providers.contains_key(&config.default_provider) {
        return Err(DesktopError::Policy(
            "Default provider must be configured.".into(),
        ));
    }
    let default_provider_config = config.providers.get(&config.default_provider).unwrap();
    if !default_provider_config.enabled {
        return Err(DesktopError::Policy(
            "Default provider must be enabled.".into(),
        ));
    }
    for (provider, provider_config) in &config.providers {
        if provider_config.enabled {
            if provider_config.api_key.is_none() && provider != "ollama" && provider != "codex" {
                return Err(DesktopError::Policy(format!(
                    "Provider '{provider}' requires an API key."
                )));
            }
            if provider == "ollama" && provider_config.base_url.is_none() {
                return Err(DesktopError::Policy("Ollama requires a base URL.".into()));
            }
        }
    }
    let mut default_count = 0;
    for (_, provider_config) in &config.providers {
        if provider_config.is_default {
            default_count += 1;
        }
    }
    if default_count != 1 {
        return Err(DesktopError::Policy(
            "Exactly one provider must be set as default.".into(),
        ));
    }

    state.with_database(|database| {
        let saved = database.save_agent_config(&config)?;
        Ok(AgentConfigResponse { config: saved })
    })
}
