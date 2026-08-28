pub const GENERATED_DIRECTORIES: &[&str] = &[
    ".git",
    ".next",
    ".venv",
    "coverage",
    "dist",
    "node_modules",
    "target",
];

pub fn is_hidden_workspace_entry(name: &str) -> bool {
    GENERATED_DIRECTORIES.contains(&name)
}

pub fn is_generated_untracked_path(path: &str) -> bool {
    path.split(['/', '\\'])
        .next()
        .is_some_and(is_hidden_workspace_entry)
}

#[cfg(test)]
mod tests {
    use super::{is_generated_untracked_path, is_hidden_workspace_entry};

    #[test]
    fn hides_generated_workspace_roots() {
        assert!(is_hidden_workspace_entry("node_modules"));
        assert!(is_hidden_workspace_entry("dist"));
        assert!(!is_hidden_workspace_entry("src"));
    }

    #[test]
    fn recognizes_generated_paths_on_supported_separators() {
        assert!(is_generated_untracked_path("node_modules/pkg/index.js"));
        assert!(is_generated_untracked_path("dist\\index.html"));
        assert!(!is_generated_untracked_path("src/dist/index.ts"));
        assert!(!is_generated_untracked_path("src/index.ts"));
    }
}
