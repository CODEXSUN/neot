use std::fs;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::path::{Component, Path};
use std::process::Command;

use serde::Serialize;
use tauri::State;

use crate::commands::workspace_policy::is_generated_untracked_path;
use crate::commands::{background_command, workspace_root};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitChange {
    path: String,
    original_path: Option<String>,
    status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGitOverview {
    pub branch: String,
    pub changed_files: Vec<GitChange>,
    pub changelog_version: Option<String>,
    pub committed_at: String,
    pub latest_commit: String,
    pub package_version: Option<String>,
    pub revision: String,
}

#[tauri::command]
pub fn desktop_project_git_overview(
    path: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectGitOverview> {
    let workspace = state.with_database(|database| database.desktop_workspace(path.trim()))?;
    let root = Path::new(&workspace.path);
    if !root.is_dir() {
        return Err(DesktopError::Policy("This registered project folder is unavailable.".into()));
    }
    let branch = current_branch(root)?;
    let revision = git_output(root, ["rev-parse", "--short=8", "HEAD"])?;
    let latest_commit = git_output(root, ["log", "-1", "--format=%s"])?;
    let committed_at = git_output(root, ["log", "-1", "--format=%cI"])?;
    let package_version = package_version(root);
    let changelog_version = changelog_version(root);
    Ok(ProjectGitOverview {
        branch,
        changed_files: git_status_for(root)?,
        changelog_version,
        committed_at,
        latest_commit,
        package_version,
        revision,
    })
}

fn git_output<const N: usize>(root: &Path, args: [&str; N]) -> DesktopResult<String> {
    let output = background_command("git").args(args).current_dir(root).output()?;
    if !output.status.success() {
        return Err(DesktopError::Policy(String::from_utf8_lossy(&output.stderr).trim().to_owned()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

fn package_version(root: &Path) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(&fs::read_to_string(root.join("package.json")).ok()?)
        .ok()?
        .get("version")?
        .as_str()
        .map(str::to_owned)
}

fn changelog_version(root: &Path) -> Option<String> {
    for name in ["CHANGELOG.mdx", "CHANGELOG.md", "Changelog.md", "changelog.md"] {
        let content = fs::read_to_string(root.join(name)).ok()?;
        if let Some(version) = content.lines().find_map(version_from_line) {
            return Some(version);
        }
    }
    None
}

fn version_from_line(line: &str) -> Option<String> {
    let value = line.trim().trim_start_matches('#').trim();
    let value = value.strip_prefix('v').or_else(|| value.strip_prefix('V')).unwrap_or(value);
    let candidate = value.split_whitespace().next()?;
    if candidate.split('.').count() >= 2 && candidate.chars().all(|item| item.is_ascii_digit() || item == '.') {
        return Some(candidate.to_owned());
    }
    None
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileDiff {
    original: String,
    modified: String,
    binary: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitWorktree {
    pub path: String,
    pub branch: String,
    pub head: String,
}

#[tauri::command]
pub fn git_status(state: State<'_, DesktopState>) -> DesktopResult<Vec<GitChange>> {
    let root = workspace_root(&state)?;
    git_status_for(&root)
}

fn git_status_for(root: &Path) -> DesktopResult<Vec<GitChange>> {
    let output = background_command("git")
        .args(["status", "--short", "-z", "--untracked-files=all"])
        .current_dir(root)
        .output()?;
    if !output.status.success() {
        return Err(DesktopError::Policy(
            String::from_utf8_lossy(&output.stderr).trim().into(),
        ));
    }
    Ok(parse_status(&output.stdout)
        .into_iter()
        .filter_map(|change| {
            let GitChange {
                original_path,
                path,
                status,
            } = change;
            if status == "??" && is_generated_untracked_path(&path) {
                return None;
            }
            Some(GitChange {
                original_path,
                status,
                path,
            })
        })
        .collect())
}

fn parse_status(output: &[u8]) -> Vec<GitChange> {
    let mut records = output
        .split(|byte| *byte == 0)
        .filter(|value| !value.is_empty());
    let mut changes = Vec::new();
    while let Some(record) = records.next() {
        if record.len() < 4 {
            continue;
        }
        let status = String::from_utf8_lossy(&record[..2]).trim().to_owned();
        let path = String::from_utf8_lossy(&record[3..]).into_owned();
        let original_path = if status.contains('R') || status.contains('C') {
            records
                .next()
                .map(|value| String::from_utf8_lossy(value).into_owned())
        } else {
            None
        };
        changes.push(GitChange {
            original_path,
            path,
            status,
        });
    }
    changes
}

#[tauri::command]
pub fn git_change_fingerprint(state: State<'_, DesktopState>) -> DesktopResult<String> {
    let root = workspace_root(&state)?;
    change_fingerprint_for(&root)
}

fn change_fingerprint_for(root: &Path) -> DesktopResult<String> {
    let changes = git_status_for(&root)?;
    let mut hasher = DefaultHasher::new();
    let mut tracked_diff = background_command("git");
    tracked_diff.args(["diff", "--binary", "HEAD", "--"]);
    let output = tracked_diff.current_dir(&root).output()?;
    if output.status.success() {
        output.stdout.hash(&mut hasher);
    } else {
        hash_diff_without_head(&root, &mut hasher)?;
    }

    let mut untracked = changes
        .iter()
        .filter(|change| change.status == "??")
        .map(|change| change.path.as_str())
        .collect::<Vec<_>>();
    untracked.sort_unstable();
    for path in untracked {
        path.hash(&mut hasher);
        fs::read(root.join(path))?.hash(&mut hasher);
    }
    Ok(format!("{:016x}", hasher.finish()))
}

fn hash_diff_without_head(root: &Path, hasher: &mut DefaultHasher) -> DesktopResult<()> {
    for args in [
        ["diff", "--binary", "--"].as_slice(),
        ["diff", "--cached", "--binary", "--"].as_slice(),
    ] {
        let output = background_command("git")
            .args(args)
            .current_dir(root)
            .output()?;
        if !output.status.success() {
            return Err(DesktopError::Policy("Git diff failed.".into()));
        }
        output.stdout.hash(hasher);
    }
    Ok(())
}

#[tauri::command]
pub fn git_diff(path: Option<String>, state: State<'_, DesktopState>) -> DesktopResult<String> {
    let root = workspace_root(&state)?;
    if let Some(path) = path.as_deref() {
        let untracked = git_status_for(&root)?
            .iter()
            .any(|change| change.status == "??" && change.path == path);
        if untracked {
            return Ok(format!(
                "Untracked file: {path}\n\n{}",
                fs::read_to_string(root.join(path))?
            ));
        }
    }
    let mut command = background_command("git");
    command.args(["diff", "HEAD", "--"]);
    if let Some(path) = path {
        command.arg(path);
    }
    checked_output(command.current_dir(root), "Git diff failed.")
}

#[tauri::command]
pub fn git_file_diff(
    path: String,
    original_path: Option<String>,
    state: State<'_, DesktopState>,
) -> DesktopResult<GitFileDiff> {
    let root = workspace_root(&state)?;
    let path = validated_git_path(&path)?;
    let original_path = validated_git_path(original_path.as_deref().unwrap_or(&path))?;
    let original = git_head_file(&root, &original_path)?;
    let modified = read_worktree_file(&root.join(&path))?;
    let binary = original.is_none() || modified.is_none();
    Ok(GitFileDiff {
        original: original.unwrap_or_default(),
        modified: modified.unwrap_or_default(),
        binary,
    })
}

fn git_head_file(root: &Path, path: &str) -> DesktopResult<Option<String>> {
    let output = background_command("git")
        .arg("show")
        .arg(format!("HEAD:{path}"))
        .current_dir(root)
        .output()?;
    if !output.status.success() {
        return Ok(Some(String::new()));
    }
    Ok(String::from_utf8(output.stdout).ok())
}

fn read_worktree_file(path: &Path) -> DesktopResult<Option<String>> {
    if !path.is_file() {
        return Ok(Some(String::new()));
    }
    Ok(String::from_utf8(fs::read(path)?).ok())
}

fn validated_git_path(path: &str) -> DesktopResult<String> {
    let value = Path::new(path);
    if path.is_empty()
        || value.is_absolute()
        || value
            .components()
            .any(|part| !matches!(part, Component::Normal(_) | Component::CurDir))
    {
        return Err(DesktopError::Policy("The Git path is invalid.".into()));
    }
    Ok(path.replace('\\', "/"))
}

#[tauri::command]
pub fn git_stage(
    paths: Vec<String>,
    expected_fingerprint: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<()> {
    if paths.is_empty() {
        return Err(DesktopError::Policy("Select at least one file.".into()));
    }
    let root = workspace_root(&state)?;
    require_reviewed_fingerprint(&root, &expected_fingerprint)?;
    let mut command = background_command("git");
    command.args(["add", "--"]).args(paths);
    checked_output(command.current_dir(root), "Git stage failed.").map(|_| ())
}

#[tauri::command]
pub fn git_unstage(paths: Vec<String>, state: State<'_, DesktopState>) -> DesktopResult<()> {
    if paths.is_empty() {
        return Err(DesktopError::Policy("Select at least one file.".into()));
    }
    let root = workspace_root(&state)?;
    let mut command = background_command("git");
    command.args(["restore", "--staged", "--"]).args(paths);
    checked_output(command.current_dir(root), "Git unstage failed.").map(|_| ())
}

#[tauri::command]
pub fn git_commit(
    message: String,
    expected_fingerprint: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<String> {
    if message.trim().is_empty() {
        return Err(DesktopError::Policy("Commit message is required.".into()));
    }
    let root = workspace_root(&state)?;
    require_reviewed_fingerprint(&root, &expected_fingerprint)?;
    let mut command = background_command("git");
    command.args(["commit", "-m", message.trim()]);
    checked_output(command.current_dir(root), "Git commit failed.")
}

fn require_reviewed_fingerprint(root: &Path, expected: &str) -> DesktopResult<()> {
    if expected.is_empty() || change_fingerprint_for(root)? != expected {
        return Err(DesktopError::Policy(
            "The change set changed after review. Review and approve it again.".into(),
        ));
    }
    Ok(())
}

#[tauri::command]
pub fn git_worktrees(state: State<'_, DesktopState>) -> DesktopResult<Vec<GitWorktree>> {
    let root = workspace_root(&state)?;
    let mut command = background_command("git");
    command.args(["worktree", "list", "--porcelain"]);
    let output = checked_output(command.current_dir(root), "Git worktree lookup failed.")?;
    let mut worktrees = Vec::new();
    for block in output.split("\n\n") {
        let value = |prefix: &str| {
            block
                .lines()
                .find_map(|line| line.strip_prefix(prefix))
                .unwrap_or("")
        };
        let path = value("worktree ");
        if !path.is_empty() {
            worktrees.push(GitWorktree {
                path: path.to_owned(),
                head: value("HEAD ").chars().take(8).collect(),
                branch: value("branch refs/heads/").to_owned(),
            });
        }
    }
    Ok(worktrees)
}

#[tauri::command]
pub fn git_create_worktree(
    name: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<GitWorktree> {
    let slug = worktree_slug(&name)?;
    let root = workspace_root(&state)?;
    create_managed_worktree(&root, &slug)
}

pub fn create_agent_task_worktree(root: &Path, task_id: i64) -> DesktopResult<GitWorktree> {
    create_managed_worktree(root, &format!("task-{task_id}"))
}

fn create_managed_worktree(root: &Path, slug: &str) -> DesktopResult<GitWorktree> {
    let parent = root
        .parent()
        .ok_or_else(|| DesktopError::Policy("The workspace has no parent directory.".into()))?;
    let managed_root = parent.join(".neot-worktrees");
    fs::create_dir_all(&managed_root)?;
    let target = managed_root.join(slug);
    if target.exists() {
        return Err(DesktopError::Policy(
            "A worktree with this name already exists.".into(),
        ));
    }
    let branch = format!("neot/{slug}");
    let mut command = background_command("git");
    command
        .args(["worktree", "add", "-b", &branch])
        .arg(&target);
    checked_output(command.current_dir(root), "Git worktree creation failed.")?;
    let head = git_head(&target)?;
    Ok(GitWorktree {
        path: target.display().to_string(),
        branch,
        head,
    })
}

#[tauri::command]
pub fn git_remove_worktree(path: String, state: State<'_, DesktopState>) -> DesktopResult<()> {
    let root = workspace_root(&state)?;
    let target = Path::new(&path).canonicalize()?;
    if target == root {
        return Err(DesktopError::Policy(
            "The open workspace cannot be removed.".into(),
        ));
    }
    let registered = registered_worktree_paths(&root)?
        .iter()
        .any(|entry| entry == &target);
    if !registered {
        return Err(DesktopError::Policy(
            "The directory is not a registered worktree.".into(),
        ));
    }
    let mut status = background_command("git");
    status.args(["status", "--porcelain", "--untracked-files=all"]);
    if !checked_output(status.current_dir(&target), "Git status failed.")?.is_empty() {
        return Err(DesktopError::Policy(
            "The worktree has uncommitted changes and was not removed.".into(),
        ));
    }
    let mut command = background_command("git");
    command.args(["worktree", "remove"]).arg(&target);
    checked_output(command.current_dir(root), "Git worktree removal failed.").map(|_| ())
}

pub fn current_branch(root: &Path) -> DesktopResult<String> {
    let output = background_command("git")
        .args(["branch", "--show-current"])
        .current_dir(root)
        .output()?;
    if !output.status.success() {
        return Err(DesktopError::Policy("Git branch lookup failed.".into()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

fn checked_output(command: &mut Command, fallback: &str) -> DesktopResult<String> {
    let output = command.output()?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(DesktopError::Policy(if error.is_empty() {
            fallback.to_owned()
        } else {
            error
        }));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

fn worktree_slug(name: &str) -> DesktopResult<String> {
    let slug = name.trim().to_lowercase();
    if slug.is_empty()
        || slug.len() > 48
        || !slug
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || value == '-')
    {
        return Err(DesktopError::Policy(
            "Use 1 to 48 lowercase letters, numbers, or hyphens for the worktree name.".into(),
        ));
    }
    Ok(slug)
}

fn git_head(root: &Path) -> DesktopResult<String> {
    let mut command = background_command("git");
    command.args(["rev-parse", "--short=8", "HEAD"]);
    checked_output(command.current_dir(root), "Git revision lookup failed.")
}

fn registered_worktree_paths(root: &Path) -> DesktopResult<Vec<std::path::PathBuf>> {
    let mut command = background_command("git");
    command.args(["worktree", "list", "--porcelain"]);
    Ok(
        checked_output(command.current_dir(root), "Git worktree lookup failed.")?
            .lines()
            .filter_map(|line| line.strip_prefix("worktree "))
            .filter_map(|path| Path::new(path).canonicalize().ok())
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::{parse_status, validated_git_path, worktree_slug};

    #[test]
    fn accepts_a_bounded_worktree_name() {
        assert_eq!(
            worktree_slug("Feature-123").expect("valid slug"),
            "feature-123"
        );
    }

    #[test]
    fn rejects_paths_and_spaces() {
        assert!(worktree_slug("../outside").is_err());
        assert!(worktree_slug("two words").is_err());
    }

    #[test]
    fn parses_unquoted_paths_and_rename_records() {
        let changes = parse_status(b"?? file with spaces.txt\0R  new name.txt\0old name.txt\0");

        assert_eq!(changes.len(), 2);
        assert_eq!(changes[0].path, "file with spaces.txt");
        assert_eq!(changes[1].path, "new name.txt");
        assert_eq!(changes[1].original_path.as_deref(), Some("old name.txt"));
    }

    #[test]
    fn rejects_git_paths_outside_the_workspace() {
        assert!(validated_git_path("../outside.txt").is_err());
        assert!(validated_git_path("C:\\outside.txt").is_err());
        assert_eq!(validated_git_path("src/main.ts").unwrap(), "src/main.ts");
    }
}
