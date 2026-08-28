use std::path::Path;

use serde_json::Value;
use tauri::State;

use crate::database::{
    DetectedLearning, ProjectLearning, ProjectLearningSettings, ProjectLearningSummary,
};
use crate::error::DesktopResult;
use crate::state::DesktopState;

use super::workspace_root;

#[tauri::command]
pub fn project_learning_summary(
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectLearningSummary> {
    let workspace = workspace_key(&state)?;
    state.with_database(|database| database.project_learning_summary(&workspace))
}

#[tauri::command]
pub fn scan_project_learning(
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectLearningSummary> {
    let root = workspace_root(&state)?;
    let workspace = root.to_string_lossy().into_owned();
    let candidates = detect_project_learning(&root);
    let detected = candidates
        .iter()
        .map(LearningCandidate::as_detected)
        .collect::<Vec<_>>();
    state.with_database(|database| {
        database.replace_detected_learnings(&workspace, &detected)?;
        database.project_learning_summary(&workspace)
    })
}

#[tauri::command]
pub fn save_project_learning_settings(
    enabled: bool,
    auto_scan: bool,
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectLearningSettings> {
    let workspace = workspace_key(&state)?;
    state.with_database(|database| {
        database.save_project_learning_settings(&workspace, enabled, auto_scan)
    })
}

#[tauri::command]
pub fn review_project_learning(
    id: i64,
    status: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<ProjectLearning> {
    let workspace = workspace_key(&state)?;
    state.with_database(|database| database.review_project_learning(&workspace, id, &status))
}

#[tauri::command]
pub fn project_learning_context(state: State<'_, DesktopState>) -> DesktopResult<String> {
    let workspace = workspace_key(&state)?;
    let items =
        state.with_database(|database| database.approved_project_learning_context(&workspace))?;
    Ok(format_context(&items))
}

struct LearningCandidate {
    fingerprint: String,
    category: String,
    title: String,
    content: String,
    evidence_path: Option<String>,
    confidence: i64,
}

impl LearningCandidate {
    fn new(category: &str, title: &str, content: String, evidence_path: &str) -> Self {
        Self {
            fingerprint: format!("{category}:{evidence_path}:{title}"),
            category: category.into(),
            title: title.into(),
            content,
            evidence_path: Some(evidence_path.into()),
            confidence: 100,
        }
    }

    fn as_detected(&self) -> DetectedLearning<'_> {
        DetectedLearning {
            fingerprint: &self.fingerprint,
            category: &self.category,
            title: &self.title,
            content: &self.content,
            evidence_path: self.evidence_path.as_deref(),
            confidence: self.confidence,
        }
    }
}

fn detect_project_learning(root: &Path) -> Vec<LearningCandidate> {
    let mut items = Vec::new();
    detect_instruction_files(root, &mut items);
    detect_node_project(root, &mut items);
    for candidate in [
        detect_manifest(root, "Cargo.toml", "Rust", "Rust project"),
        detect_manifest(root, "pyproject.toml", "Python", "Python project"),
        detect_manifest(root, "go.mod", "Go", "Go project"),
        detect_manifest(root, "docker-compose.yml", "Execution", "Docker Compose"),
        detect_manifest(root, "compose.yml", "Execution", "Docker Compose"),
    ]
    .into_iter()
    .flatten()
    {
        items.push(candidate);
    }
    detect_directories(root, &mut items);
    detect_skill_roots(root, &mut items);
    items
}

fn detect_instruction_files(root: &Path, items: &mut Vec<LearningCandidate>) {
    for path in [
        "AGENTS.md",
        "assist/AGENT-GUIDE.md",
        ".github/copilot-instructions.md",
    ] {
        if root.join(path).is_file() {
            items.push(LearningCandidate::new(
                "Governance",
                "Repository instructions",
                format!("Read {path} before changing this repository."),
                path,
            ));
        }
    }
}

fn detect_node_project(root: &Path, items: &mut Vec<LearningCandidate>) {
    let path = root.join("package.json");
    let Ok(content) = std::fs::read_to_string(path) else {
        return;
    };
    let Ok(package) = serde_json::from_str::<Value>(&content) else {
        return;
    };
    let name = package
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("Node project");
    items.push(LearningCandidate::new(
        "Runtime",
        "Node package",
        format!("The root Node package is {name}."),
        "package.json",
    ));
    if package.get("workspaces").is_some() {
        items.push(LearningCandidate::new(
            "Architecture",
            "Node workspace",
            "The repository uses Node workspaces. Run package commands from the repository root."
                .into(),
            "package.json",
        ));
    }
    if let Some(manager) = package.get("packageManager").and_then(Value::as_str) {
        items.push(LearningCandidate::new(
            "Tooling",
            "Package manager",
            format!("Use the package manager declared by the repository: {manager}."),
            "package.json",
        ));
    }
}

fn detect_manifest(
    root: &Path,
    path: &str,
    category: &str,
    title: &str,
) -> Option<LearningCandidate> {
    root.join(path).is_file().then(|| {
        LearningCandidate::new(
            category,
            title,
            format!("The repository contains {path}."),
            path,
        )
    })
}

fn detect_directories(root: &Path, items: &mut Vec<LearningCandidate>) {
    for path in ["apps", "packages", "src", "test", "tests", "assist", "docs"] {
        if root.join(path).is_dir() {
            items.push(LearningCandidate::new(
                "Path",
                &format!("{path} directory"),
                format!("The repository uses {path}/ as a project path."),
                path,
            ));
        }
    }
}

fn detect_skill_roots(root: &Path, items: &mut Vec<LearningCandidate>) {
    for path in [".neot/skills", "assist/skills/library"] {
        if root.join(path).is_dir() {
            items.push(LearningCandidate::new(
                "Skills",
                "Project skill root",
                format!("Load applicable project skills from {path}."),
                path,
            ));
        }
    }
}

fn format_context(items: &[ProjectLearning]) -> String {
    if items.is_empty() {
        return String::new();
    }
    let facts = items
        .iter()
        .map(|item| {
            let evidence = item
                .evidence_path
                .as_deref()
                .unwrap_or("reviewed by the user");
            format!(
                "- [{}] {} Evidence: {}",
                item.category, item.content, evidence
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "<project_learning>\nUse only these approved project facts. Recheck the evidence before a risky change.\n{facts}\n</project_learning>"
    )
}

fn workspace_key(state: &State<'_, DesktopState>) -> DesktopResult<String> {
    Ok(workspace_root(state)?.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::{detect_project_learning, format_context};
    use crate::database::ProjectLearning;

    #[test]
    fn formats_only_supplied_approved_context() {
        let context = format_context(&[ProjectLearning {
            id: 1,
            category: "Path".into(),
            title: "Source".into(),
            content: "Use src/ for source files.".into(),
            evidence_path: Some("src".into()),
            source: "detected".into(),
            status: "approved".into(),
            confidence: 100,
            is_current: true,
            updated_at: "2026-08-15".into(),
        }]);
        assert!(context.contains("Use src/ for source files."));
        assert!(context.contains("Evidence: src"));
    }

    #[test]
    fn detects_repository_instruction_file() {
        let root = std::env::temp_dir().join(format!("neot-learning-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("AGENTS.md"), "# Rules").unwrap();
        let items = detect_project_learning(&root);
        assert!(items.iter().any(|item| item.category == "Governance"));
        std::fs::remove_dir_all(root).unwrap();
    }
}
