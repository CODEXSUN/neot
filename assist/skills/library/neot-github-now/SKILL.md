---
name: neot-github-now
description: Prepare or perform an explicitly authorized NEOT commit, pull, and push through the repository GitHub helper. Use for repository synchronization, not release publishing or VPS deployment.
---

# NEOT GitHub Now

Use this job only for a reviewed source change that is ready to synchronize.

1. Read `assist/documentation/release-notes-standard.md` and the completed release-log result.
2. Run `git status --short --branch`, `git remote -v`, `npm.cmd run version:show`, and `git log -1 --oneline`.
3. Confirm that every changed file is in the authorized release scope. Stop if an unknown or unrelated change remains.
4. Confirm that the newest changelog entry has `Database Changes`, `App Codebase Changes`, and `Verification`.
5. Run `npm.cmd run github:now -- --dry-run --no-bump`. Record its version, changed-file count, and generated
   `#<patch> - <title>` subject.
6. Run `npm.cmd run check:versions`, the affected workspace check, `git diff --check`, and the release checks required
   by the changelog entry.
7. After explicit Git authorization, run `npm.cmd run github:now -- --yes --no-bump` when the current version and
   changelog entry already describe this release.
8. Use `npm.cmd run github:now -- --yes` only when the user explicitly wants a new patch bump and a new changelog entry.
9. Record the observed commit SHA, pushed branch, generated subject, and post-push `git status --short --branch`.

Stop on a pull conflict, failed check, unexpected changed file, rejected push, or missing upstream. Do not use this job
as proof of a GitHub Release or VPS deployment.
