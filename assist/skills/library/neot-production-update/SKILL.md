---
name: neot-production-update
description: Safely release and operate NEOT at /home/neot on its Ubuntu Docker VPS. Use when preparing a NEOT version, checking SSH production state, running the guarded Docker updater, installing or diagnosing the systemd update watcher, verifying migrations and health, cleaning NEOT-only one-off resources, or recording deployment evidence.
---

# NEOT Production Update

Run repository release checks locally, deploy only a reviewed fast-forward
commit, and retain evidence for every production action. Read
`assist/documentation/release-notes-standard.md` and `references/runbook.md`
before changing the VPS.

## Workflow

1. Read repository governance, the release-note standard, and the newest
   changelog entry. Inspect the complete Git status. Treat all
   existing changes as user-owned until their release scope is confirmed.
2. Run focused checks, the full repository check, and the GitHub helper dry run.
3. Confirm that the changelog has complete database, codebase, and verification
   evidence. Confirm package version contracts before staging.
4. Confirm that the Git subject matches `#<patch> - <title>` from the newest
   changelog entry. Commit and push only after explicit authorization.
5. Connect to the pinned VPS host key. Inspect `/home/neot`, Docker, disk space,
   current containers, and deployment configuration without printing secrets.
6. Require a clean `main` checkout and a fast-forward remote update. Never reset,
   stash, or overwrite unexpected production changes.
7. Use the watcher or `bash update.sh --check` followed by `bash update.sh --yes`.
   The updater owns verification images, database backup, migrations, seeds,
   application replacement, health checks, metadata, and compatible rollback.
8. Verify Git commit, application version, Compose health, HTTP health, migration
   list, backup checksum, deployment metadata, and systemd timer.
9. Add the actual deployment outcome to the same release entry. Distinguish local
   static checks from live SSH, Docker, MariaDB, provider, and public HTTP evidence.

## Per-release checklist

1. Confirm the intended commit and desktop version are already on `origin/main`.
2. Open an SSH session without echoing `.env` values. Verify host key, `/home/neot`, branch, clean status, disk, and Compose state.
3. Fetch `origin/main`; stop when the target is not a fast-forward or the checkout is dirty.
4. Run the watcher preflight or `bash update.sh --check`; inspect the candidate result before executing an update.
5. Run the watcher once or `bash update.sh --yes` only after explicit production approval.
6. Watch the service journal until it reaches a terminal result. Do not start a second updater while one is active.
7. Verify API health, web health, Compose health, migration list, retained backup, deployed commit/version, and watcher timer.
8. Write a short deployment record with time, commit, version, commands, health results, backup identifier, and unresolved issues.

## Watcher safety rules

- The timer may fetch and deploy only `origin/main` into `/home/neot`.
- Verify a candidate in a detached temporary Git worktree before fast-forwarding.
- Preserve `.env`, deployment secrets, MariaDB containers, volumes, networks, and
  all unrelated Docker resources.
- Cleanup is limited to stopped Compose one-off containers from the configured
  NEOT project and unused images in the configured NEOT image namespace.
- Never run global Docker prune commands.
- On failure, stop, retain logs and backups, and diagnose before retrying.
