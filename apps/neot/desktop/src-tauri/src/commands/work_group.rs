use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::{background_command, display_name, sanitize_path};
use crate::database::{DesktopWorkspace, SavedRepositoryUrl};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

const IGNORED_DIRECTORIES: &[&str] =
    &[".git", ".idea", ".vscode", "dist", "node_modules", "target"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkGroup {
    name: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCandidate {
    path: String,
    name: String,
    connected: bool,
    kind: String,
    relationship: String,
    project_name: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkGroupScan {
    group: WorkGroup,
    repositories: Vec<RepositoryCandidate>,
    saved_repository_urls: Vec<SavedRepositoryUrl>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCloneRequest {
    url: String,
    kind: String,
    relationship: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRepositoryUrlRequest {
    url: String,
    kind: String,
    relationship: String,
}

#[tauri::command]
pub fn choose_work_group(state: State<'_, DesktopState>) -> DesktopResult<WorkGroupScan> {
    let selected = rfd::FileDialog::new()
        .pick_folder()
        .ok_or_else(|| DesktopError::Policy("Work group selection was canceled.".into()))?;
    let root = normalize_work_group(selected)?;
    let path = root.display().to_string();
    let (workspaces, saved_urls) = state.with_database(|database| {
        database.save_default_work_group(&path)?;
        let workspaces = database.desktop_setup()?.workspaces;
        let saved_urls = database.list_repository_urls(&path)?;
        Ok((workspaces, saved_urls))
    })?;
    build_work_group_scan(root, workspaces, saved_urls)
}

#[tauri::command]
pub fn scan_work_group(
    path: Option<String>,
    state: State<'_, DesktopState>,
) -> DesktopResult<WorkGroupScan> {
    let default_path = state.with_database(|database| {
        let setup = database.desktop_setup()?;
        Ok((
            setup
                .profile
                .and_then(|profile| profile.default_work_group_path),
            setup.workspaces,
        ))
    })?;
    let selected = path.or(default_path.0).ok_or_else(|| {
        DesktopError::Policy("Select a work group before scanning for repositories.".into())
    })?;
    let root = normalize_work_group(PathBuf::from(selected))?;
    let saved_urls = state
        .with_database(|database| database.list_repository_urls(&root.display().to_string()))?;
    build_work_group_scan(root, default_path.1, saved_urls)
}

#[tauri::command]
pub fn clone_github_repository(
    request: GitHubCloneRequest,
    state: State<'_, DesktopState>,
) -> DesktopResult<WorkGroupScan> {
    validate_workspace_mapping(&request.kind, &request.relationship)?;
    let default_path = state.with_database(|database| {
        let setup = database.desktop_setup()?;
        Ok(setup
            .profile
            .and_then(|profile| profile.default_work_group_path))
    })?;
    let group_path = default_path.ok_or_else(|| {
        DesktopError::Policy("Select a work group before cloning a repository.".into())
    })?;
    let root = normalize_work_group(PathBuf::from(group_path))?;
    let name = github_repository_name(&request.url)?;
    let target = root.join(&name);
    if target.exists() {
        return Err(DesktopError::Policy(format!(
            "A folder named {name} already exists in this work group."
        )));
    }
    clone_repository(&root, &request.url, &name)?;
    let path = target.display().to_string();
    let workspace = DesktopWorkspace {
        path,
        name,
        kind: request.kind.clone(),
        relationship: request.relationship.clone(),
        project_name: None,
        tagline: None,
        changelog_path: None,
        owner_name: None,
        started_on: None,
        due_on: None,
        project_type: None,
        priority: "normal".into(),
        project_id: None,
        pinned: false,
        last_opened_at: String::new(),
    };
    let (refreshed_workspaces, saved_urls) = state.with_database(|database| {
        database.save_desktop_workspace(&workspace)?;
        database.save_repository_url(
            &root.display().to_string(),
            &request.url,
            &request.kind,
            &request.relationship,
        )?;
        let workspaces = database.desktop_setup()?.workspaces;
        let saved_urls = database.list_repository_urls(&root.display().to_string())?;
        Ok((workspaces, saved_urls))
    })?;
    build_work_group_scan(root, refreshed_workspaces, saved_urls)
}

#[tauri::command]
pub fn save_repository_url(
    request: SaveRepositoryUrlRequest,
    state: State<'_, DesktopState>,
) -> DesktopResult<WorkGroupScan> {
    validate_workspace_mapping(&request.kind, &request.relationship)?;
    github_repository_name(&request.url)?;
    let group_path = state
        .with_database(|database| {
            let setup = database.desktop_setup()?;
            Ok(setup
                .profile
                .and_then(|profile| profile.default_work_group_path))
        })?
        .ok_or_else(|| {
            DesktopError::Policy("Select a work group before saving a repository URL.".into())
        })?;
    let root = normalize_work_group(PathBuf::from(group_path))?;
    let (workspaces, saved_urls) = state.with_database(|database| {
        database.save_repository_url(
            &root.display().to_string(),
            &request.url.trim(),
            &request.kind,
            &request.relationship,
        )?;
        let workspaces = database.desktop_setup()?.workspaces;
        let saved_urls = database.list_repository_urls(&root.display().to_string())?;
        Ok((workspaces, saved_urls))
    })?;
    build_work_group_scan(root, workspaces, saved_urls)
}

fn normalize_work_group(selected: PathBuf) -> DesktopResult<PathBuf> {
    let root = selected
        .canonicalize()
        .map(sanitize_path)
        .unwrap_or_else(|_| sanitize_path(&selected));
    if !root.is_dir() {
        return Err(DesktopError::Policy(
            "The work group must be a directory.".into(),
        ));
    }
    Ok(root)
}

fn build_work_group_scan(
    root: PathBuf,
    workspaces: Vec<DesktopWorkspace>,
    saved_repository_urls: Vec<SavedRepositoryUrl>,
) -> DesktopResult<WorkGroupScan> {
    let mut repositories = Vec::new();
    if is_repository(&root) {
        repositories.push(repository_candidate(&root, &workspaces));
    }

    for entry in fs::read_dir(&root)? {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let path = sanitize_path(entry.path());
        let name = entry.file_name().to_string_lossy().into_owned();
        if !path.is_dir() || IGNORED_DIRECTORIES.contains(&name.as_str()) || !is_repository(&path) {
            continue;
        }
        repositories.push(repository_candidate(&path, &workspaces));
    }

    repositories.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(WorkGroupScan {
        group: WorkGroup {
            name: display_name(&root),
            path: root.display().to_string(),
        },
        repositories,
        saved_repository_urls,
    })
}

fn is_repository(path: &Path) -> bool {
    let git = path.join(".git");
    git.is_dir() || git.is_file()
}

fn repository_candidate(path: &Path, workspaces: &[DesktopWorkspace]) -> RepositoryCandidate {
    let path_string = path.display().to_string();
    let saved = workspaces
        .iter()
        .find(|workspace| workspace.path == path_string);
    let (kind, relationship) = suggested_type(path);
    RepositoryCandidate {
        path: path_string,
        name: display_name(path),
        connected: saved.is_some(),
        kind: saved
            .map(|workspace| workspace.kind.clone())
            .unwrap_or(kind),
        relationship: saved
            .map(|workspace| workspace.relationship.clone())
            .unwrap_or(relationship),
        project_name: saved.and_then(|workspace| workspace.project_name.clone()),
    }
}

fn suggested_type(path: &Path) -> (String, String) {
    let name = display_name(path).to_lowercase();
    if name.contains("plugin") {
        return ("plugin".into(), "addOn".into());
    }
    ("application".into(), "project".into())
}

fn clone_repository(root: &Path, url: &str, name: &str) -> DesktopResult<()> {
    let output = background_command("git")
        .args(["clone", "--", url.trim(), name])
        .current_dir(root)
        .output()?;
    if output.status.success() {
        return Ok(());
    }
    let error = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    Err(DesktopError::Policy(if error.is_empty() {
        "GitHub clone failed. Check Git and your GitHub credentials.".into()
    } else {
        error
    }))
}

fn github_repository_name(url: &str) -> DesktopResult<String> {
    let path = url
        .trim()
        .strip_prefix("https://github.com/")
        .or_else(|| url.trim().strip_prefix("git@github.com:"))
        .ok_or_else(|| DesktopError::Policy("Use a GitHub HTTPS or SSH repository URL.".into()))?;
    let parts = path.trim_end_matches('/').split('/').collect::<Vec<_>>();
    if parts.len() != 2 || parts.iter().any(|part| !valid_github_segment(part)) {
        return Err(DesktopError::Policy(
            "Use a GitHub repository URL in owner/repository form.".into(),
        ));
    }
    let repository = parts[1].strip_suffix(".git").unwrap_or(parts[1]);
    if repository.is_empty() || repository == "." || repository == ".." {
        return Err(DesktopError::Policy(
            "The GitHub repository name is invalid.".into(),
        ));
    }
    Ok(repository.to_owned())
}

fn valid_github_segment(value: &str) -> bool {
    !value.is_empty()
        && value != "."
        && value != ".."
        && value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
        })
}

fn validate_workspace_mapping(kind: &str, relationship: &str) -> DesktopResult<()> {
    if !matches!(kind, "application" | "plugin" | "document" | "other") {
        return Err(DesktopError::Policy(
            "The repository type is invalid.".into(),
        ));
    }
    if !matches!(relationship, "project" | "addOn" | "standalone") {
        return Err(DesktopError::Policy(
            "The repository link type is invalid.".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{build_work_group_scan, github_repository_name};

    #[test]
    fn scans_only_direct_git_repositories() {
        let root = std::env::temp_dir().join(format!("neot-work-group-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(root.join("application/.git")).expect("create direct repository");
        std::fs::create_dir_all(root.join("nested/repository/.git"))
            .expect("create nested repository");
        std::fs::create_dir_all(root.join("node_modules/ignored/.git"))
            .expect("create ignored repository");

        let scan =
            build_work_group_scan(root.clone(), Vec::new(), Vec::new()).expect("scan work group");

        assert_eq!(scan.repositories.len(), 1);
        assert_eq!(scan.repositories[0].name, "application");
        std::fs::remove_dir_all(root).expect("remove work group");
    }

    #[test]
    fn accepts_github_https_and_ssh_urls() {
        assert_eq!(
            github_repository_name("https://github.com/CODEXSUN/neot.git").expect("HTTPS URL"),
            "neot"
        );
        assert_eq!(
            github_repository_name("git@github.com:CODEXSUN/zetro.git").expect("SSH URL"),
            "zetro"
        );
        assert!(github_repository_name("https://example.com/repository").is_err());
    }
}
