use std::fs;
use std::path::Path;
use std::process::Command;

use serde::Serialize;
use serde_json::Value;
use tauri::State;

use crate::commands::workspace_policy::is_hidden_workspace_entry;
use crate::commands::workspace_root;
use crate::error::DesktopResult;
use crate::state::DesktopState;

const MAX_FILE_BYTES: u64 = 1_000_000;
const MAX_RESULTS: usize = 250;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    path: String,
    line: usize,
    preview: String,
}

#[tauri::command]
pub fn search_workspace(
    query: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<Vec<SearchMatch>> {
    let query = query.trim().to_lowercase();
    if query.len() < 2 {
        return Ok(Vec::new());
    }
    let root = workspace_root(&state)?;
    if let Some(matches) = ripgrep_search(&root, &query)? {
        return Ok(matches);
    }
    let mut matches = Vec::new();
    search_directory(&root, &root, &query, &mut matches)?;
    Ok(matches)
}

fn ripgrep_search(root: &Path, query: &str) -> DesktopResult<Option<Vec<SearchMatch>>> {
    let mut command = Command::new("rg");
    command
        .args([
            "--json",
            "--fixed-strings",
            "--ignore-case",
            "--glob",
            "!.git/**",
            "--glob",
            "!node_modules/**",
            "--glob",
            "!dist/**",
            "--glob",
            "!target/**",
            "--glob",
            "!.venv/**",
            "--glob",
            "!.next/**",
            "--glob",
            "!coverage/**",
            "--",
            query,
            ".",
        ])
        .current_dir(root);
    hide_child_window(&mut command);
    let output = match command.output() {
        Ok(output) => output,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    if output.status.code() == Some(1) {
        return Ok(Some(Vec::new()));
    }
    if !output.status.success() {
        return Ok(None);
    }
    Ok(Some(parse_ripgrep_output(&output.stdout)))
}

fn parse_ripgrep_output(output: &[u8]) -> Vec<SearchMatch> {
    String::from_utf8_lossy(output)
        .lines()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
        .filter(|event| event["type"] == "match")
        .filter_map(|event| {
            let data = event.get("data")?;
            let path = data.get("path")?.get("text")?.as_str()?;
            let line = data.get("line_number")?.as_u64()? as usize;
            let preview = data.get("lines")?.get("text")?.as_str()?.trim();
            Some(SearchMatch {
                path: path
                    .trim_start_matches(".\\")
                    .trim_start_matches("./")
                    .to_owned(),
                line,
                preview: preview.chars().take(180).collect(),
            })
        })
        .take(MAX_RESULTS)
        .collect()
}

fn search_directory(
    root: &Path,
    directory: &Path,
    query: &str,
    matches: &mut Vec<SearchMatch>,
) -> DesktopResult<()> {
    if matches.len() >= MAX_RESULTS {
        return Ok(());
    }
    for entry in fs::read_dir(directory)?.filter_map(Result::ok) {
        let path = entry.path();
        if path.is_dir() {
            if !is_hidden_workspace_entry(&entry.file_name().to_string_lossy()) {
                search_directory(root, &path, query, matches)?;
            }
            continue;
        }
        if entry.metadata()?.len() > MAX_FILE_BYTES {
            continue;
        }
        let Ok(content) = fs::read_to_string(&path) else {
            continue;
        };
        for (index, line) in content.lines().enumerate() {
            if line.to_lowercase().contains(query) {
                matches.push(SearchMatch {
                    path: path
                        .strip_prefix(root)
                        .unwrap_or(&path)
                        .display()
                        .to_string(),
                    line: index + 1,
                    preview: line.trim().chars().take(180).collect(),
                });
                if matches.len() >= MAX_RESULTS {
                    return Ok(());
                }
            }
        }
    }
    Ok(())
}

#[cfg(windows)]
fn hide_child_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x08000000);
}

#[cfg(not(windows))]
fn hide_child_window(_command: &mut Command) {}

#[cfg(test)]
mod tests {
    use super::parse_ripgrep_output;

    #[test]
    fn parses_ripgrep_json_matches() {
        let output = br#"{"type":"begin","data":{"path":{"text":"./src/main.ts"}}}
{"type":"match","data":{"path":{"text":"./src/main.ts"},"lines":{"text":"const agent = true;\n"},"line_number":12,"absolute_offset":90,"submatches":[]}}
"#;
        let matches = parse_ripgrep_output(output);

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].path, "src/main.ts");
        assert_eq!(matches[0].line, 12);
        assert_eq!(matches[0].preview, "const agent = true;");
    }
}
