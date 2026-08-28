---
name: neot-release-log
description: Prepare a NEOT changelog and version-evidence job without committing, publishing, or deploying. Use when a project needs release notes or version verification.
---

# NEOT Release Log

Use this job before GitHub synchronization, a desktop release, or a VPS update.

1. Read `assist/documentation/release-notes-standard.md`, repository governance, `git status --short --branch`, `npm.cmd run version:show`, and the newest changelog entry.
2. Run `npm.cmd run release:scope`. Read every reported area before writing release notes.
3. Define the release scope. Existing uncommitted files are user-owned until the user includes them in this release.
4. When a version update is authorized, use `npm.cmd run version:bump -- --title "<factual title>"` once. It aligns package manifests, the lockfile, desktop metadata, and the changelog heading.
5. Complete the newest changelog entry before any commit. It must contain `Database Changes`, `App Codebase Changes`, and `Verification`.
6. If database update is `Yes`, list every migration and its exact tables, columns, indexes, constraints, seeds, and data transformations. If it is `No`, state that no persisted schema or data changed.
7. Cover every meaningful `release:scope` group with a factual behavior bullet. Group generated assets together when they come from one source change.
8. Run focused checks that match the changed leaves. In Verification, record each command, result, and live check gap. Never write that an unchecked path passed.
9. Derive the commit subject from the newest changelog entry. The format is `#<patch> - <title>`. For `v 1.0.73`, use `#73 - <title>`.
10. Finish with `npm.cmd run check:versions`, the required release checks, `git diff --check`, and `git status --short`.

Stop before commit, tag, push, publish, or deployment unless those mutations are separately authorized. A release log is evidence for later jobs, not proof that those jobs ran.
