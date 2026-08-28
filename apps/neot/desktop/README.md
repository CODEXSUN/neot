# NEOT

This workspace owns the standalone React, Tauri, and Rust desktop IDE.

## Ownership

- React owns the IDE shell and all desktop presentation modules.
- Rust owns files, Git, terminal processes, Docker, SQLite, and NEOT synchronization.
- The desktop app calls NEOT through the configured public API contract.
- The app does not import Platform or NEOT private source paths.

## Commands

Run `npm.cmd run desktop:check` to verify the React application.

Run `npm.cmd run desktop:dev` after Rust and the Tauri Windows prerequisites are installed.

Run `npm.cmd run desktop:build` to create the signed desktop bundle after signing is configured.

## Implemented foundation

- workspace-scoped file browsing with lazy directory expansion;
- an agent-first workspace with Agent first and the file browser second;
- an instant local-first shell that restores the workspace before background Git, file indexing,
  and agent startup finish;
- one shared, background-warmed Codex runtime and a Monaco editor loaded only when Explorer opens;
- a complete bundled Codex App Server runtime, including code mode, sandbox helpers, and ripgrep, over JSON-RPC with streamed turns and reusable threads;
- workspace-scoped agent tasks and messages persisted in desktop SQLite;
- recent-task switching with saved transcripts and Codex thread resume;
- read-only and workspace-write agent modes with command and file approval cards;
- streamed agent messages, command activity, changed-file evidence, diffs, and interruption;
- Monaco multi-tab editing, dirty-state protection, and Ctrl+S saves;
- bounded recursive workspace text search;
- ripgrep-first workspace search with a bounded built-in fallback;
- Zod validation for Codex events before they enter desktop state;
- a small Zustand store for shared shell and panel state;
- Git status, diff, stage, unstage, commit, and guarded worktree management;
- native PowerShell terminal sessions backed by the Windows pseudoconsole;
- Node.js, Python, Docker, Git, and WSL capability detection;
- project Python metadata, interpreter, virtual environment, and NVIDIA tool detection;
- guarded workspace-local `.venv` creation without automatic package downloads;
- repository and project skill discovery;
- reviewed project learning with repository evidence, approval, rejection, and stale-fact detection;
- project learning remains visible for review and is not automatically appended to Codex coding turns;
- local SQLite tasks and outbound NEOT synchronization contracts;
- detected external-editor, File Explorer, and Windows Terminal launching;
- compact and relaxed workspace density;
- Windows system, light, and dark themes with a saved local preference;
- a Ctrl+K command palette for workspace views, files, terminal, and appearance;
- a local environment summary with branch context;
- one desktop process with repeat-launch focus behavior;
- no external console window in release builds;
- signed update checks and background downloads;
- user-approved passive MSI installation and app restart;
- one MSI installer and Windows-managed uninstaller lineage;
- Vitest coverage for the desktop protocol boundary.

See `assist/documentation/desktop-release.md` for signing, release, update, and uninstall steps.
The release command collects deployable files under `dist/deploy/desktop/<version>/windows-x64`.

The coding agent bundles the matching native Codex engine and uses the local Codex authentication
profile. `NEOT_CODEX_BIN` can override the engine during development. The former
`CODELOGIX_CODEX_BIN` name remains a compatibility fallback. Language servers,
debugger adapters, non-OpenAI model-provider authentication, and Python dependency profiles remain
later milestones.

## Codex wrapper contract

NEOT is a transparent desktop client for the bundled Codex App Server. It does not replace
Codex with a second planner, rewrite a user prompt, generate a fallback answer, or infer successful
verification from a command event. The visible chat contains the user prompt and the streamed Codex
response. The activity lane shows only App Server tool and command events.

The Tauri bridge owns Windows process lifecycle, workspace policy, local task/message storage, and
rendering. It is not an agentic decision layer. Codex owns reasoning, tool selection, progress,
approvals, and final answers. NEOT only presents the recorded native state.
