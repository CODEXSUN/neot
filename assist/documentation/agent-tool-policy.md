# Desktop Agent Tool Policy

## Purpose

Every NEOT agent connector uses the same tool vocabulary. A connector can report an action only after the desktop runtime observes it. A model response is not evidence that a file, command, Git operation, or deployment happened.

## Shared tools

| Tool              | Permission                                          | Result evidence                                |
| ----------------- | --------------------------------------------------- | ---------------------------------------------- |
| Inspect workspace | Read-only                                           | Paths and bounded file excerpts read.          |
| Search code       | Read-only                                           | Query, scope, and matching paths.              |
| Plan work         | Read-only                                           | Proposed steps, risks, and evidence checklist. |
| Write files       | Approval required                                   | Patch or edited-file list.                     |
| Refactor code     | Approval required                                   | Patch, affected symbols, and semantic checks.  |
| Run checks        | Approval required when the command can change state | Command, exit code, and bounded output.        |
| Review changes    | Read-only                                           | Diff, Git state, and findings.                 |

## Connector rules

- Codex retains its native App Server tool execution and streams its observed events into NEOT.
- OpenCode runs as a separate packaged CLI worker. NEOT uses its built-in `plan` agent, disables
  external plugins for project jobs, never passes `--auto`, and records each observed JSON tool
  event before showing the final response.
- OpenCode Zen credentials remain in OpenCode's own credential store. An optional OpenRouter key is
  read only by the Tauri backend and passed to the child process environment; it is never placed in
  command arguments or job logs.
- A project-job watcher records step boundaries, tool status changes, bounded command output,
  response-stream progress, elapsed runtime, silence duration, cancellation, and the final result.
  The worker is stopped after ten minutes.
- Online and local models receive the same capability labels, but do not receive direct shell or filesystem authority from prompt text.
- A non-Codex connector can plan with read-only evidence. It may request a bounded desktop action only through the approval workflow.
- The desktop validates workspace roots, uses managed isolated worktrees for writable work, and records the resulting patch, command, or review evidence.
- A connector never receives provider secrets, unrestricted shell access, or permission to publish, push, or deploy automatically.

## Release-log task

The `Log` task first collects read-only release facts: repository version, newest changelog heading, changed paths, and migration paths. It produces a proposed title, version action, changelog entry, and verification checklist. Writing the changelog or running a version bump requires explicit approval.
