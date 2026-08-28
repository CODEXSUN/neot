# Release Notes Standard

Use this standard for NEOT. Copy it into another application before using its release tools.

## Purpose

Release notes are evidence. They describe only completed work and known gaps.

## Required Header

Keep these lines at the top of `assist/documentation/CHANGELOG.md`.

```md
Current version: 1.0.73
Release tag: v-1.0.73
Changelog label: v 1.0.73
```

Create the entry in this format.

```md
## v-1.0.73

### [v 1.0.73] 2026-08-22 12:19 pm - Local project-task runner reliability

#### Database Changes

- Database update: Yes.
- Added migration `0010_project_jobs.sql`.
- Added `desktop_project_jobs` with `workspace_path`, `recipe_key`, `model_target`, and `status`.

#### App Codebase Changes

- Bumped repository version to 1.0.73.
- Added the project job queue and durable job evidence.

#### Verification

- Passed `npm.cmd run check:versions`.
- Did not publish the GitHub release or update the VPS.
```

## Database Changes

Set `Database update: Yes.` only when persisted data changes.

For `Yes`, list every changed item:

1. Migration filename and version.
2. Created or altered table, column, index, constraint, trigger, or view.
3. Seed or backfill behavior.
4. Data transformation and rollback or recovery behavior.
5. Database that received the migration during verification.

For `No`, write this sentence:

```md
- Database update: No.
- No persisted schema, seed, or data changed.
```

## App Codebase Changes

List behavior, not vague file activity.

1. State the version bump.
2. Name the owning module or application.
3. State the user or operator effect.
4. State security, approval, or compatibility behavior when it changes.
5. Do not combine planned work with completed work.

## Release Scope Inventory

Before writing the changelog, run:

```powershell
npm.cmd run release:scope
```

The command groups every tracked and untracked change by application area. Read
every group before writing the release note.

The changelog does not need one bullet for every file. It must cover every
meaningful group. For example, one icon regeneration bullet can cover all
generated platform icon files.

If the report shows `Unclassified`, inspect those paths and either update the
release note or update the inventory rules. Do not release with an unexplained
area.

## Verification

Write each command as it ran. State its result.

List separate evidence for:

1. Version consistency.
2. Formatting or whitespace.
3. Focused typecheck, lint, test, build, or package check.
4. Migration or database lifecycle.
5. Live desktop, API, browser, model, release, or VPS check.

State skipped work directly. For example: `GitHub release was not published.`

## Commit Subject

Use this exact form:

```text
#<patch> - <title>
```

Get `<patch>` and `<title>` from the newest changelog entry.

For `v 1.0.73 - Local project-task runner reliability`, use:

```text
#73 - Local project-task runner reliability
```

Do not invent an issue number. Do not use the Git tag as the commit subject.

## Required Order

1. Read the agent guide and this standard.
2. Inspect `git status --short --branch`.
3. Confirm the release scope with the user when unrelated work exists.
4. Run `npm.cmd run version:bump -- --title "<title>"`.
5. Complete the changelog entry.
6. Run focused checks and record the result.
7. Run `npm.cmd run release:scope`, `npm.cmd run check:versions`, and `git diff --check`.
8. Run the GitHub helper dry run.
9. Only after authorization, pull, stage, commit, push, tag, publish, and deploy.

## Stop Rules

Stop and report the blocker when:

- A version owner does not match the root version.
- A release note lacks a required section.
- A database change is marked `Yes` without exact detail.
- A check fails or is not applicable.
- The working tree contains unapproved changes.
- The remote branch, tag, workflow, or VPS target does not match the release plan.
- Required approval, credential, or production target is absent.
