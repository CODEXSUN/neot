# NEOT Agent Guide

## Required Reading

1. `assist/README.md`
2. `assist/governance/rules.md`
3. `assist/architecture/module-boundaries.md`
4. `assist/architecture/data-strategy.md`
5. `assist/architecture/engineering-orchestration.md`
6. `assist/architecture/future-platform-blueprint.md`
7. `assist/documentation/project-inventory.md`

## Runtime Contract

- NEOT is standalone, local-authenticated, and single-client.
- NEOT is the external label. `neot` is the stable technical name for packages, routes,
  permissions, environment keys, database objects, and source ownership.
- Platform owns users, roles, permissions, assignments, the API/web servers, and the database
  connection.
- NEOT modules own their complete backend and frontend leaves, migrations, seeds, attachments,
  planning records, registry records, and synchronization records.
- Platform composes NEOT only through the public `@neot/neot-api` and
  `@neot/neot-web` workspace contracts.
- Framework and UI are consumed only through their public package exports.

## Change Rules

- Preserve unrelated worktree changes.
- Keep product behavior inside its NEOT module leaf.
- Use fixed route contracts and explicit Zod schemas.
- Keep orchestration provider-neutral; agent definitions must not import model-provider SDKs.
- Read runtime configuration only from `.env`.
- Migrations safely upgrade existing databases and record keys in `schema_migrations`.
- Seeds are repeatable; protected administrator creation is controlled by `INITIAL_ADMIN_*`.
- Run check, build, and the database-backed runtime smoke before completion when available.

## Release Evidence Rules

1. Read `assist/documentation/release-notes-standard.md` before a version bump, commit, release, or deployment.
2. Read the newest changelog entry before choosing a Git commit message.
3. Use the exact subject format `#<patch> - <title>`. Derive `<patch>` and `<title>` from the newest changelog entry. For example, `v 1.0.73` uses `#73 - <title>`.
4. Update every repository-owned version file with `npm.cmd run version:bump -- --title "<title>"`. Do not edit one manifest by hand.
5. Record the release under `Database Changes`, `App Codebase Changes`, and `Verification`.
6. If database update is `Yes`, list every migration, table, column, index, constraint, seed, or data transformation that changes. Do not use a generic database summary.
7. In Verification, name every command that ran and every live check that did not run. Do not claim a pending release, GitHub mutation, model request, or VPS update succeeded.
8. Before a commit, run `npm.cmd run release:scope`, `npm.cmd run check:versions`, the required focused checks, `git diff --check`, and `git status --short`.
9. Treat unreviewed worktree changes as user-owned. Do not stage them with `git add -A` until the user includes them in the release scope.
