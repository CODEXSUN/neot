# Changelog

Current version: 1.0.87
Release tag: v-1.0.87
Changelog label: v 1.0.87

## v-1.0.87

### [v 1.0.87] 2026-08-28 10:14 am - Student and master learning access

#### Database Changes

- Database update: Yes.
- Added the protected `student` and `master` role seeds.
- Added `neot.learning.view`, `neot.learning.participate`, and `neot.learning.manage` permission seeds.
- Assigned view and participation rights to students.
- Assigned view, participation, and management rights to masters.
- Applied these seeds to the local `neot_db` database during the API restart.
- No schema migration or existing user-role backfill was required.

#### App Codebase Changes

- Bumped repository version to 1.0.87.
- Bumped the Flutter application version to 1.0.2+3.
- Added public student and master registration with a name, email address, password, and role.
- Stored new passwords with the existing PBKDF2 password hash implementation.
- Added duplicate email handling and restricted registration to student and master roles.
- Added permission checks for learning reads, student participation, and master content management.
- Added web sign-in and registration forms with role-aware learning entry routes.
- Hid master publishing controls from student learning views.
- Replaced the Flutter development login with student and master sign-in and registration forms.
- Kept quiz attempts and questions available to students while restricting course publishing to masters.
- Updated the Flutter quiz controls for the current RadioGroup API.

#### Verification

- Passed `npm.cmd run typecheck --workspace @neot/platform-api`.
- Passed `npm.cmd run typecheck --workspace @neot/platform-web`.
- Passed `npm.cmd run typecheck --workspace @neot/neot-web`.
- Passed `flutter analyze` with no issues.
- Built `build/app/outputs/flutter-apk/app-debug.apk` with `flutter build apk --debug`.
- Confirmed student registration returns the student role with view and participation permissions.
- Confirmed master registration returns the master role with view, participation, and management permissions.
- Confirmed a student can load the learning snapshot and receives HTTP 403 when publishing a course.
- Confirmed a master can publish a course, subject, and lesson through the live local API.
- Confirmed duplicate registration returns HTTP 409.
- Ran the release scope inventory. It reports 1,039 paths because the copied repository baseline remains untracked.
- Passed `node tools/repository-release.mjs check:versions` for repository version 1.0.87.
- Passed `git diff --check`.
- Rebuilt the debug APK after the Flutter version update.
- Passed the GitHub helper dry run without changing Git or publishing a release.
- Did not publish a GitHub release or replace the mobile update APK.

## v-1.0.86

### [v 1.0.86] 2026-08-26 11:40 pm - Ideas workspace and discussion improvements

#### Database Changes

- Database update: Yes.
- Added `neot.ideas.attachments.storage-key.v2` for file-backed idea images.
- Added `neot.ideas.colors.v3` for persisted category and status colors.
- Added `neot.ideas.visibility.v4` for public and author-only private ideas.
- Added `neot.ideas.private-default.v5` to make new database records private by default without changing existing idea visibility.
- Added `neot.ideas.assignees.v6` with `neot_ideas.assignee_uuids_json` for verified multi-user idea assignments.
- Kept legacy database-backed images readable.

#### App Codebase Changes

- Bumped repository version to 1.0.86.
- Added Markdown editing, working rich-text controls, and file-browser, paste, and drop image uploads.
- Made the Markdown editor use the full available editor height.
- Added a small inset around the HTML preview so content does not touch its edges.
- Stored idea images under `storage/ideas/<idea-uuid>/<image-name>` with stable preview links.
- Added numeric idea references, category filters, two-line short descriptions, and persistent category and status colors.
- Removed the short-description input and now generate the excerpt from the first 500 content characters.
- Added conditional list counts for votes, comments, and replies.
- Added full-row navigation, lift-on-hover feedback, colored badges, and outlined tag chips.
- Added nested discussion replies, thumbs-up and thumbs-down reactions, compact relative times, and thread dividers.
- Added a fixed three-line comment composer with a dark inline post button and space below the discussion thread.
- Added an icon-only public or private control with a tooltip in the Idea editor.
- Restricted private idea lists, details, comments, images, polls, drawings, and reactions to the author.
- Simplified the Ideas editor, list toolbar, sidebar fields, and responsive layout.
- Made the Ideas list full-width on mobile and limited mobile content previews to two lines.
- Styled private ideas with a yellow line-art lock, yellow border, and a mild 20% yellow background.
- Added a right-side metadata drawer that slides out, expands the editor, and provides arrow controls to collapse or reopen it.
- Replaced drawer chevrons with full arrows and moved the collapse control to the drawer's left edge.
- Replaced the Ideas list reference `#` prefix with an ordered-list icon so `#` remains reserved for hashtags.
- Replaced the idea reference prefix with a lightly dimmed hexagon-star badge and a hyphen between the number and title.
- Added 100-item Ideas pagination that stays hidden until more than 100 filtered ideas are available.
- Made every new idea private at the editor, API, repository, and database boundaries until its author explicitly shares it publicly.
- Added automatic `#hashtag` extraction from rich-text and HTML idea content into the persisted tag list.
- Replaced hardcoded editor mentions with active Identity-user `@mention` autocomplete and automatic assignment when a verified user is selected.
- Added a searchable, multi-user `Assigned to` field with removable chips and persisted user UUIDs, and displayed assignees on the idea detail page.
- Added a host-provided active-user directory contract so NEOT verifies Idea assignees without owning Platform identity records.

#### Verification

- Passed the UI, NEOT API, NEOT web, platform API, and platform web TypeScript checks.
- Passed the NEOT API build after the visibility migration and access-control changes.
- Passed the image storage round-trip and image validation check.
- Passed live Ideas list, editor, detail, navigation, badge, statistic, timestamp, and discussion layout checks.
- Live drawer verification confirmed the editor expands from 641 px to 961 px and returns to 641 px after reopening.
- Live editor verification confirmed the public and private icon states and their accessible tooltip labels.
- Live verification confirmed new ideas start with a disabled private lock and a `Save private idea` action, while lists below 101 items do not show pagination.
- Applied and listed `neot.ideas.private-default.v5` against the local MariaDB database.
- Applied and listed `neot.ideas.assignees.v6` against the local MariaDB database.
- Live editor verification confirmed automatic `#automation` and `#review` tag chips, active-user lookup, verified `@admin` autocomplete, and automatic assignment after mention selection.
- Focused lint did not run because the existing root ESLint configuration imports the unavailable `typescript-eslint-compiler` package; ESLint stopped before analyzing source files.
- Mobile verification confirmed full-width 375 px idea rows and 48 px two-line content previews.
- Passed the repository version check and `git diff --check`.

## v-1.0.85

### [v 1.0.85] 2026-08-26 10:15 pm - Enhanced ideas editor and image storage

#### Database Changes

- Database update: Yes.
- Added the forward migration `neot.ideas.attachments.storage-key.v2` with a nullable `storage_key` column for file-backed idea images.
- Added the forward migration `neot.ideas.colors.v3` with persisted `category_color` and `status_color` fields.
- New idea images are stored under `storage/ideas/<idea-uuid>/<image-name>` (or the configured `NEOT_STORAGE_PATH`) while legacy database-backed images remain readable.

#### App Codebase Changes

- Bumped repository version to 1.0.85.
- Added a Markdown editing mode with GitHub-style Markdown parsing and HTML synchronization.
- Replaced the list selector with direct bullet, numbered, and task list buttons that preserve the text selection.
- Added command checks for rich-text toolbar actions and aligned all Tiptap packages to version 3.30.2.
- Added image selection from the file browser plus paste and drag-and-drop image upload support.
- Added stable image links that render the uploaded file in the editor and idea preview.
- Added image type, signature, filename, path, and 8 MB size validation for stored idea images.
- Exposed each idea's existing database ID as a stable human-facing reference such as `#1` or `#265` across list, detail, and edit views.
- Increased discussion reply indentation, limited Reply actions to top-level comments, and added mutually exclusive thumbs-up and thumbs-down reaction counts.
- Added conditional Ideas-list statistics for thumbs up, thumbs down, top-level comments, and replies; zero-value statistics stay hidden.
- Added category and status color pickers, persisted their selected colors, and rendered tinted category badges plus outlined status badges with matching dots.
- Reserved a fixed two-line short-description field before the main editor, persisted it through the existing `excerpt` column, and displayed it in the Ideas list.
- Moved status badges into the right-side metadata lane and increased spacing between idea titles and category badges.
- Made every Ideas row a clearly interactive full-row target with an upward lift, surface highlight, and shadow on hover or keyboard focus.
- Styled list tags as compact wrapped chips with rounded gray outlines and a subtle neutral fill.
- Right-aligned discussion authors and timestamps, added compact second/minute/hour relative times, and corrected local MariaDB timestamps that arrive with an incorrect UTC suffix.
- Removed vertical borders from top-level comments, retained them for replies, and added an 80%-width divider after every complete comment thread.
- Replaced Category and Status palette icons with solid, fully rounded-corner color swatches filled by the selected value.
- Simplified the Ideas editor and made its writing area responsive to the navigation sidebar and viewport size.
- Simplified the Ideas list to a responsive category-filter-and-action toolbar, retained relaxed row spacing, and removed the duplicate page search, page title block, and floating view controls.
- Updated the NEOT sidebar tagline to `Developer Portal`.

#### Verification

- Passed the UI, NEOT API, NEOT web, platform API, and platform web TypeScript checks.
- Passed the Markdown round-trip and bullet-list command runtime check.
- Passed the idea image filesystem round-trip, filename sanitization, and MIME mismatch validation check.
- Live Ideas list verification confirmed database-backed references render as `#1` and `#2` after rebuilding the NEOT API package.
- Live Ideas list verification confirmed zero-value statistics are hidden and the existing discussion renders separate counts for 2 comments and 5 replies.
- Live verification confirmed the color migration defaults, editor color inputs, tinted category badge, and outlined status badge render without browser errors.
- Live editor verification confirmed the short-description field reserves two rows, enforces 500 characters, and removes input beyond the second line.
- Live navigation verification confirmed clicking an idea's description area opens its detail page with no browser errors.
- Live discussion verification confirmed right-aligned metadata and real relative values such as `40m ago` and `1h ago` instead of repeated `just now` labels.
- Live discussion verification confirmed two top-level 80% dividers, reply-only vertical borders, and no browser errors.
- Passed the repository version check and `git diff --check`.

## v-1.0.84

### [v 1.0.84] 2026-08-23 11:13 am - Compass Runner release evidence and live console

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.84.
- Updated the standalone Compass Runner to persist release sessions and local history, expose true preflight, version, commit, and publish stages, and show a final report only after verified publication evidence.
- Streamed the repository release publisher output through the worker so the desktop console receives live release and workflow progress.
- Added per-stage event idempotency, safe recovery of legacy saved sessions, explicit stop-monitoring semantics, report copying, workflow and release links, and a slim independently scrolling console.

#### Verification

- Passed `npm.cmd run typecheck --workspace @neot/desktop`, `npm.cmd run test --workspace @neot/desktop -- compass-runner` (3 tests), `npm.cmd run lint --workspace @neot/desktop`, and `npm.cmd run build --workspace @neot/desktop`.
- Passed `npm.cmd run github:release:test` (6 tests), `npm.cmd run check:versions`, `npm.cmd run release:scope`, and `git diff --check`.
- Live desktop verification completed a read-only Compass preflight. The stage became completed and the console rendered one record for each of the four worker events.

## v-1.0.83

### [v 1.0.83] 2026-08-23 10:33 am - Compass Runner live release flow

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.83.
- Updated Compass Runner so each live release stage records pending, awaiting approval, running, completed, or failed status and cannot display final success before release publication has been verified.
- Made the version stage idempotent after a Tauri development restart, preventing a duplicate version bump when a previously approved update already exists.
- Preserved release-stage state in the local desktop session so a configuration-triggered desktop restart can recover safely into the next protected approval.
- Added desktop development start guards that reuse the active Vite and NEOT process together, but relaunch Tauri when Vite remains available after the desktop process exits.

#### Verification

- Passed `npm.cmd run typecheck --workspace @neot/desktop`.
- Passed `npm.cmd run test --workspace @neot/desktop -- compass-runner` (3 tests).
- Passed `npm.cmd run lint --workspace @neot/desktop`, `npm.cmd run release:scope`, `npm.cmd run check:versions`, and `git diff --check`.
- Live desktop preflight and validation completed. The live version-stage recovery verified the existing approved update without creating a second version.
- Commit, push, GitHub workflow, public release assets, and packaged release verification are pending the following protected stages.

## v-1.0.81

### [v 1.0.81] 2026-08-23 9:53 am - Compass Runner live release flow

#### Database Changes

- Database update: No.
- No migration, seed, or persisted data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.81.
- Added the standalone Compass Runner release worker, its Tauri command bridge, and the desktop workspace entry point.
- Added explicit, approval-gated stages for version and changelog updates, Git synchronisation, commit and push, and release publication.
- Added observed worker-event streaming, release-scope classification, and focused Compass Runner tests.
- Corrected porcelain-status parsing and added bounded retries with captured stderr for staging failures.
- Removed the unrelated sales and CRM sample scenarios from the standalone runner tests.

#### Verification

- Passed `npm.cmd run test --workspace @neot/desktop -- compass-runner` (3 tests).
- Passed `npm.cmd run typecheck --workspace @neot/desktop`.
- Passed `cargo check --manifest-path apps/neot/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions`, `npm.cmd run release:scope`, and `git diff --check`.
- Live desktop preflight and the approved version update were observed. In `tauri dev`, changing `tauri.conf.json` restarts the development desktop; the remaining protected stages are resumed after that restart.

## v-1.0.79

### [v 1.0.79] 2026-08-23 9:39 am - Compass release update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.79.

#### Verification

- Not yet run. Add the exact commands and live checks before commit.

## v-1.0.78

### [v 1.0.78] 2026-08-23 9:39 am - Compass release update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.78.

#### Verification

- Not yet run. Add the exact commands and live checks before commit.

## v-1.0.77

### [v 1.0.77] 2026-08-22 3:08 pm - Factual project job release results

#### Database Changes

- Database update: No.
- The factual release result is derived from existing local job events and read-only workspace metadata. It does not change SQLite schema or data.

#### App Codebase Changes

- Bumped repository version to 1.0.77.
- Added a deterministic release-review result for the `Log` project task: current version, newest changelog heading, changed-path count, migration-path count, and the actions that did not occur.
- Labels local model output as an unverified advisory, so it cannot be mistaken for completed validation or a written release note.
- Reduced the local planning output budget to 160 tokens because the final release result is generated from observed evidence instead of model prose.
- Removed the temporary repository-rules and writable-code demo tasks and their demo-only execution code before release.
- Kept the production OpenCode planner, observed event watcher, model discovery, approval boundary, and project-job evidence flow.
- Removed the remaining desktop ESLint warnings from the Gemini settings controls.

#### Verification

- Passed `npm.cmd run check`. It covered encoding, deployment, repository boundaries, artifacts, modules, databases, workspace typechecks and lints, and framework tests.
- Passed `npm.cmd run check --workspace @neot/desktop`: TypeScript, ESLint with no warnings, 30 desktop tests, and the production build passed.
- Passed `cargo fmt --manifest-path apps/neot/desktop/src-tauri/Cargo.toml` and `cargo test --manifest-path apps/neot/desktop/src-tauri/Cargo.toml` with 25 tests.
- Passed `npm.cmd audit --audit-level=moderate` with zero reported vulnerabilities.
- Passed `npm.cmd run release:scope`; all 142 changed paths were classified with no unexplained area.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Passed `npm.cmd run github:release:test` and the `desktop-v1.0.77` GitHub release dry run. No tag or GitHub release was created.
- Verified a live local Ollama request to `qwen2.5-coder:7b`. It returned text but invented release claims, which this change now treats as unverified advisory output.

## v-1.0.76

### [v 1.0.76] 2026-08-22 3:01 pm - Project job review handoff and factual local plans

#### Database Changes

- Database update: No.
- The review handoff uses the existing project-job event evidence and does not change its SQLite schema or persisted data contract.

#### App Codebase Changes

- Bumped repository version to 1.0.76.
- Marked completed local plans as review-required instead of presenting a non-functional approval state.
- Added a review-in-Agent-chat action that retrieves the saved planning output and inserts it into the coding-agent composer as a draft.
- Tightened local release-log prompting: it distinguishes observed facts from pending work, uses semantic versions correctly, prohibits invented verification claims, and limits the response length.
- Reduced local planner output from 512 to 320 generated tokens to improve response time and readability.

#### Verification

- Passed `npm.cmd run check --workspace @neot/desktop`: TypeScript, 30 desktop tests, and the production build passed. ESLint reported two existing `no-explicit-any` warnings in `settings-panel.tsx` and no errors.
- Passed `cargo fmt --manifest-path apps/neot/desktop/src-tauri/Cargo.toml` and `cargo check --manifest-path apps/neot/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Did not run a live desktop review-handoff interaction after this change.

## v-1.0.75

### [v 1.0.75] 2026-08-22 2:50 pm - Project job log controls and local model patience

#### Database Changes

- Database update: No.
- Copying and clearing project-job log evidence does not change the database schema or data contract.

#### App Codebase Changes

- Bumped repository version to 1.0.75.
- Added a copy control for the full text of a project-job log in both the inline task row and the dedicated log page.
- Replaced browser `confirm()` prompts with an accessible NEOT Shadcn-styled clear-log dialog that supports backdrop dismissal and Escape.
- Increased the local Ollama planning request timeout from 90 to 180 seconds and reduced progress events from every 4 seconds to every 12 seconds. Stop remains available while the request is running.

#### Verification

- Passed `npm.cmd run check --workspace @neot/desktop`: TypeScript, 30 desktop tests, and the production build passed. ESLint reported two existing `no-explicit-any` warnings in `settings-panel.tsx` and no errors.
- Passed `cargo fmt --manifest-path apps/neot/desktop/src-tauri/Cargo.toml` and `cargo check --manifest-path apps/neot/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Did not run a live desktop interaction or local-model request after this change.

## v-1.0.74

### [v 1.0.74] 2026-08-22 2:45 pm - Shared agent tools and release-log evidence

#### Database Changes

- Database update: No.
- The release-log planning task reads local workspace evidence only. It does not change SQLite, MariaDB, or saved job records.

#### App Codebase Changes

- Bumped repository version to 1.0.74.
- Defined the shared desktop agent tool vocabulary: inspect, search, plan, write, refactor, verify, and review.
- Recorded the approval and evidence boundary for Codex, online, and local connectors. A model reply is not treated as proof that an action happened.
- Made every repeatable project-job recipe declare the same implementation tool set and require approval before it can write, refactor, change a version, or perform external work.
- Updated the local `Log` planning prompt with observed repository version, newest changelog heading, changed-path count, migration-path count, and a bounded path preview.
- Added the `neot-agent-tools` skill and the shared desktop agent-tool policy for future connector and job implementations.

#### Verification

- Passed `npm.cmd run check --workspace @neot/desktop`: TypeScript, 30 desktop tests, and the production build passed. ESLint reported two existing `no-explicit-any` warnings in `settings-panel.tsx` and no errors.
- Passed `cargo check --manifest-path apps/neot/desktop/src-tauri/Cargo.toml` and `cargo fmt --manifest-path apps/neot/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Did not run a live local-model request or a desktop UI interaction for this release record.

## v-1.0.73

### [v 1.0.73] 2026-08-22 12:19 pm - Local project-task runner reliability

#### Database Changes

- Database update: Yes.
- Updated local desktop SQLite through additive migrations `0005` to `0011`.
- Added `default_work_group_path` to `desktop_local_profile` with identity and startup fields retained.
- Added `desktop_saved_repository_urls` with `work_group_path`, `url`, `kind`, `relationship`, `created_at`, and `updated_at`.
- Added `archived`, `review_requested`, `execution_path`, and `worktree_branch` to `desktop_agent_tasks`.
- Added `desktop_project_jobs` with workspace, recipe, title, model target, model, status, and timestamps.
- Added `desktop_project_job_events` with job, level, message, and timestamp evidence.
- Added `desktop_project_job_runtime` with a job key, running status, and start timestamp for restart recovery.
- Did not modify an existing user SQLite data file during this release preparation.

#### App Codebase Changes

- Bumped repository version to 1.0.73.
- Added project overview task rows, per-job logs, local Ollama model refresh, cancellation, active-state polling, and bounded local-run retries.
- Added local identity, work-group discovery, saved repository URLs, repository types, clone-and-connect, project cards, project overview, and project-only chat history.
- Added isolated task worktree metadata, parallel chat tabs, task archive and review controls, model selection, action evidence, and a more accurate runtime state surface.
- Reordered desktop startup around an early Agent view, lazy workspace loading, quiet sidecar startup, and desktop performance helpers.
- Regenerated NEOT desktop icon assets and aligned Tauri, package, lockfile, workspace, and internal dependency versions.
- Added the local Ollama and Qdrant Docker environment, setup scripts, and operator documentation.
- Added observed local-job stages for model availability, prompt dispatch, elapsed response waiting, response receipt, retry, completion, failure, and cancellation. The local runner remains plan-only and does not claim file, GitHub, or VPS changes.
- Expanded the four reusable project-job skills with explicit checkpoints, stop conditions, and evidence required for release hand-off.
- Added release-note validation and a release-scope inventory command so a future agent reviews every changed area before it writes a concise changelog.

#### Verification

- Passed `npm.cmd run check`, including repository boundaries, typechecks, lint, tests, dependency checks, and package builds.
- Passed `npm.cmd run check:versions`, `npm.cmd run desktop:release:build`, `npm.cmd run desktop:release:check`, and `git diff --check`.
- Passed `npm.cmd run github:release:test` and `npm.cmd run github:release -- --dry-run --timeout-minutes 120`.
- Passed `npm.cmd run check --workspace @neot/desktop` and `cargo check --manifest-path apps/neot/desktop/src-tauri/Cargo.toml` after the local-job progress update.
- Verified that the local Ollama service lists the installed `qwen2.5-coder:7b` and `nomic-embed-text:latest` models.
- Full local generation, GitHub mutation, release publishing, and VPS deployment remain pending their dedicated gates.

## v-1.0.72

### [v 1.0.72] 2026-08-22 12:40 am - Chat deletion confirmation

#### Database Changes

- Database update: Yes.
- The existing additive local SQLite chat-action migration continues to preserve archived and review states before a chat is permanently deleted.

#### App Codebase Changes

- Bumped repository version to 1.0.72.
- Added a NEOT Shadcn-themed warning dialog before a chat and its local messages are permanently deleted.
- Kept the dialog open if deletion fails and surfaced the failure in the agent workspace.

## v-1.0.71

### [v 1.0.71] 2026-08-21 9:54 am - Desktop startup and local workspace setup

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.71.

## v-1.0.70

### [v 1.0.70] 2026-08-21 8:49 am - version update

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.70.

## v-1.0.69

### [v 1.0.69] 2026-08-21 8:48 am - NEOT canonical logo and installer identity

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.69.
- Made the supplied platform SVG the canonical NEOT logo asset.
- Added light, dark, and favicon variants that derive from the canonical mark.
- Regenerated the desktop native icon set for Windows, macOS, Android, and iOS.
- Rebuilt the signed NEOT MSI with the new application icon.
- Updated the GitHub desktop-release workflow to publish NEOT installer assets.

#### Verification

- Passed the NEOT desktop typecheck, lint, 29-test suite, and production build.
- Passed the platform web production build.
- Verified the signed MSI package metadata and NEOT executable payload.
- Passed `npm.cmd run check:versions` and `git diff --check`.

## v-1.0.68

### [v 1.0.68] 2026-08-21 7:37 am - Persistent cloud sync connection

#### Database Changes

- Database update: Yes.
- Added `last_verified_at` to the persisted cloud sync connection.

#### App Codebase Changes

- Bumped repository version to 1.0.68.
- Added persistent cloud token records with created, last-used, active, and revoked states.
- Added cloud token listing and revocation endpoints.
- Verified a cloud token before the local installation saves its encrypted binding.
- Added explicit connection verification, disconnect, and reconnect controls.
- Kept local project data when a user disconnects the cloud binding.
- Added saved installation, verification, transfer, revision, and error status to the sync page.
- Separated the cloud token manager from the local connection controls.

#### Verification

- Passed NEOT API and web typechecks, lint checks, and builds.
- Applied the additive migration to the local `neot_db` database.
- Passed the database lifecycle and module boundary checks.
- Passed `git diff --check`.
- The full repository check remains blocked by the existing `apps/codeit/desktop/node_modules` directory.

## v-1.0.67

### [v 1.0.67] 2026-08-20 - CodeIt chat workspace polish

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the repository version to 1.0.67.
- Added the CodeIt footer status bar with version, workspace, runtime, context, and sandbox status.
- Moved workspace breadcrumbs into the top bar and aligned them with the chat workspace.
- Simplified the top bar and moved the active model badge to the right side.
- Kept agent activity visible while a response runs.
- Showed message copy actions only on hover or keyboard focus.
- Added muted separators below the top bar and agent message metadata.

#### Verification

- Passed `npm run check --workspace @codeit/desktop` after each CodeIt UI update.
- Passed `git diff --check`.

### [Session] 2026-08-17 - Multi-provider Agent settings and terminal flicker fix

#### Database Changes

- Database update: Yes.
- Added desktop SQLite migration `0004_settings.sql` for agent configuration.
- Extended `desktop_settings` table with provider-specific keys (enabled, is_default, api_key, base_url, model).

#### App Codebase Changes

- **Settings Panel - Agent & Model tab redesign:**
  - Visual provider selector with icons for Codex, OpenRouter, OpenCode, Claude, Ollama.
  - Per-provider configuration cards with enable/disable toggle, API key input, base URL (Ollama), model dropdown.
  - Default provider selection with exactly-one validation.
  - Model lists per provider: Codex (GPT-4o family), OpenRouter (100+ models), OpenCode, Claude (3.5 Sonnet, Opus, Haiku), Ollama (llama3.1, codellama, qwen2.5-coder, deepseek-coder).
  - Provider credentials stored locally in desktop SQLite, never sent to servers.
- **Terminal flicker fix:**
  - Terminal now handles its own loading state inline in the tab bar.
  - Removed outer Suspense fallback that caused flash between loading → empty → connected.
  - xterm host pre-renders immediately; shell selector and clear button disabled until pty connects.
- **Updated types:**
  - `AgentConfig` now includes `defaultProvider` and `providers` map with `ProviderConfig`.
  - TypeScript types updated for exact optional properties.

#### Verification

- Passed desktop TypeScript check, ESLint check, Vitest tests, and production build.
- Passed Rust compilation checks.
- Verified provider cards render correctly in light/dark themes.
- Verified terminal shows inline spinner during pty connection without layout shift.
- Verified validation: default provider must be enabled, exactly one default, API keys required for cloud providers.

### [Session] 2026-08-16 - Persistent Project Agent action history

#### Database Changes

- Database update: Yes.
- Added the repeatable `neot.orchestration-chat.sql.v4` migration.
- Added `actions_json` to Project Agent chat messages with an empty-list default.

#### App Codebase Changes

- Added a provider-neutral action record for commands, tools, searches, file changes, delegates, and context compaction.
- Streamed action status changes from the Codex App Server to the active Project Agent response.
- Stored the completed action timeline with each assistant message.
- Added a compact Work completed timeline with command totals and expandable earlier actions.
- Kept action history visible after a page reload and conversation reopen.
- Displayed native Codex automatic context compaction as a completed action.
- Kept OpenAI Codex responsible for automatic context compaction and preserved the active thread.
- Updated the orchestration architecture and project inventory records.

#### Verification

- Passed the NEOT API and web TypeScript checks.
- Passed focused ESLint checks for the changed API and web files.
- Passed three action-normalization and context-compaction tests.
- Passed the database lifecycle and module-boundary checks.
- Built the Platform web production bundle.
- Applied the v4 migration to the configured local MariaDB database.
- Ran `git status --short` through the live Project Agent in read-only mode.
- Confirmed the completed command remained visible after a page reload and history reopen.
- Did not force a large-context compaction during the live check.

### [Session] 2026-08-15 - CodeLogix internal coding beta

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Combined the completed CodeLogix Agent, editor, Git review, and workspace safety changes.
- Kept Agent tasks connected while developers inspect files and other workspace views.
- Added bounded file context with a 1,000-line limit for each attached file.
- Added exact change fingerprints before stage and commit actions.
- Added stalled-turn recovery and safe prompt submission rollback.
- Hid untracked generated workspace roots from Explorer, search, and source control.
- Synchronized all repository and desktop version owners through the release tool.
- Kept the release scope at internal coding beta. A signed installer remains a separate release step.

#### Verification

- Passed the full repository policy, typecheck, lint, and framework test suite.
- Passed the NEOT API, Platform API, NEOT web, and CodeLogix production builds.
- Passed 14 desktop Vitest tests and 11 native Rust tests.
- Passed the repository version, formatting, and diff checks.
- Verified persistent Agent and editor state in the native CodeLogix app.
- Did not build or publish a signed installer in this release step.

### [Session] 2026-08-15 - Safe Agent prompt handoff

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Prepared project learning and attached files before creating a durable user message.
- Blocked duplicate sends while CodeLogix prepares or submits a prompt.
- Added visible Preparing context and Sending states to the Agent composer.
- Restored the prompt when context preparation or Codex submission fails.
- Removed an unaccepted user message from local history after a failed Codex submission.
- Reported a separate error when local history cleanup fails.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and production build.
- Passed all 11 native Rust tests, including the local message rollback assertion.
- Passed native Rust compilation for version 1.0.56.
- Passed the repository version and diff checks.
- Did not send a live model request.

### [Session] 2026-08-15 - Persistent desktop Agent session

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Kept the Agent session mounted while developers use Explorer and other workspace views.
- Preserved live Agent events, task state, and the connection across view changes.
- Started Monaco only after the developer first leaves the Agent view.
- Kept Monaco mounted after its first start to preserve open files and unsaved edits.
- Opened command-palette file results in Explorer.
- Reset the editor model when the selected workspace changes.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and production build.
- Verified Agent to Explorer to Agent switching in the native CodeLogix app.
- Confirmed the task transcript and Codex connection remained active after each switch.
- Confirmed the second Explorer switch reused the loaded editor without a loading state.
- Passed the native Rust compilation and repository version checks.
- Did not send a model request or change the sample workspace.

### [Session] 2026-08-15 - One-thousand-line file context limit

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Replaced the per-file character limit with a strict 1,000-line limit.
- Kept the three-file limit and the 24,000-character total prompt limit.
- Added a test that removes all content after line 1,000.

#### Verification

- Passed the desktop TypeScript, ESLint, test, and production build checks.
- Passed the native Rust compilation check.
- Passed the repository version consistency and diff checks.

### [Session] 2026-08-14 - Navigation drawer and local editor runtime

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Removed the floating view-options toggle and spacing selector.
- Added a top-left application menu with an extensible side drawer.
- Added workspace, command, terminal, update, and Settings actions to the drawer.
- Moved the System, Light, and Dark theme selector into Settings.
- Bundled Monaco and its language workers with the application instead of loading them remotely.
- Preloaded Monaco while the workspace picker is open to reduce the first-file delay.
- Fixed the editor grid so Monaco always receives the available workbench height.
- Added explicit file-read and editor-start states.
- Prevented duplicate and stale file loads during rapid tab changes.
- Added smooth editor scrolling and caret movement.

#### Verification

- Passed the desktop TypeScript, ESLint, and production build checks.
- Confirmed the production build includes local Monaco editor and language workers.
- Passed Rust formatting, tests, and compilation checks.
- Verified file opening, drawer actions, and theme changes in the native application.
- Built the signed CodeLogix 1.0.43 Windows MSI and updater signature.

### [Session] 2026-08-14 - CodeLogix package identity

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Changed the package display name from NEOT Desktop to CodeLogix.
- Changed the native window, landing screen, workspace, update center, and release labels to CodeLogix.
- Replaced the remaining visible Desktop labels with Local runtime and Updates.
- Kept the application identifier and updater signing keys unchanged for upgrade compatibility.
- Removed the gray border from the generated application logo.
- Regenerated the Windows, macOS, Android, iOS, and Store icon assets.

#### Verification

- Visually verified the borderless 512-pixel and 32-pixel icons.
- Passed the desktop TypeScript, ESLint, production build, Rust formatting, tests, and compilation checks.
- Built the signed CodeLogix 1.0.42 Windows MSI and updater signature.
- Verified the native release window uses the CodeLogix title and borderless logo.

### [Session] 2026-08-14 - NEOT desktop application icon

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Replaced the default Tauri desktop icon with the blue four-panel mark used by the desktop landing screen.
- Added a desktop-owned SVG source with a high-contrast rounded tile.
- Generated Windows ICO and Store tiles, macOS ICNS, PNG, Android, and iOS icon assets from one source.
- Kept the web logo unchanged.

#### Verification

- Visually verified the generated 512-pixel and 32-pixel desktop icons.
- Built the signed version 1.0.41 Windows MSI and updater signature.
- Passed the desktop TypeScript, ESLint, production build, Rust formatting, test, and compilation checks.

### [Session] 2026-08-14 - Signed desktop updater and MSI lifecycle

#### Database Changes

- Database update: No.
- Preserved the desktop SQLite database during MSI updates and uninstall.

#### App Codebase Changes

- Added signed desktop update checks against the public GitHub release feed.
- Added background update downloads with progress status.
- Added an update center that waits for user approval before installation.
- Added passive MSI installation and app restart after a successful update.
- Standardized Windows distribution on one MSI installer lineage.
- Added minimum updater and process permissions to the main desktop window.
- Added a draft GitHub release workflow with MSI signatures and `latest.json`.
- Stored the updater private key outside the repository with a Windows-encrypted password.
- Added a local signed-release build command.
- Documented installer ownership, uninstall, recovery, signing, and release steps.

#### Verification

- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting, tests, and compilation checks.
- Verified the update center in a clean live browser session.
- Verified the browser fallback keeps installation disabled and logs no errors.
- Built the version 1.0.40 MSI and updater signature.
- Verified the embedded public key matches the updater signature key identifier.
- Confirmed the public update feed remains unavailable until the first draft release is published.

### [Session] 2026-08-14 - Single desktop instance and embedded terminal

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Changed the Windows release executable to the GUI subsystem.
- Removed the extra console or Windows Terminal window during desktop startup.
- Added a single-instance guard for the desktop application.
- Focused and restored the existing window when the application starts again.
- Kept PowerShell inside the IDE terminal after a workspace opens.
- Kept the embedded terminal hidden on the workspace selection screen.

#### Verification

- Passed Rust formatting and compilation checks.
- Built the version 1.0.39 release executable.
- Verified two launches keep only one NEOT desktop process.
- Verified no Windows Terminal process starts with the release executable.
- Built the version 1.0.39 MSI and NSIS installers.

### [Session] 2026-08-14 - System theme and command workflow

#### Database Changes

- Database update: No.
- Saved the theme preference in local desktop storage.

#### App Codebase Changes

- Added Windows system, light, and dark theme options.
- Updated Monaco and terminal colors when the theme changes.
- Added a Ctrl+K command palette.
- Added commands for workspace selection, navigation, files, terminal, and themes.
- Added a local environment and branch summary to the title bar.
- Kept the editor and terminal engines outside the startup bundle.

#### Verification

- Verified system theme resolution in the live desktop web surface.
- Verified Ctrl+K command-palette opening and command rendering.
- Verified a theme command changes the active theme and closes the palette.
- Verified no browser console errors or horizontal overflow.
- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting, tests, and compilation checks.
- Passed the repository text encoding and version checks.
- Built the version 1.0.38 MSI and NSIS installers.

### [Session] 2026-08-14 - Local Python and ML environment

#### Database Changes

- Database update: No.
- Kept Python environment state in the workspace and local runtime.

#### App Codebase Changes

- Detected Python project files and the available interpreter.
- Detected a workspace-local `.venv` and its Python version.
- Detected NVIDIA command-line tools without starting a GPU workload.
- Added guarded `.venv` creation inside the open workspace.
- Kept package and ML dependency installation explicit.
- Added Python environment status and creation controls to the runtime panel.
- Added guarded Git worktree creation and clean-worktree removal.

#### Verification

- Added native path and worktree-name policy tests.
- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting, test, and compilation checks.
- Passed the repository text encoding and version checks.
- Built the version 1.0.37 MSI and NSIS installers.

### [Session] 2026-08-14 - Local NEOT IDE MVP

#### Database Changes

- Database update: No.
- Kept desktop tasks and sync records in the existing local SQLite database.

#### App Codebase Changes

- Added a lazy workspace file tree and a multi-tab Monaco editor.
- Added dirty-file protection and Ctrl+S saves.
- Added bounded workspace text search.
- Added a native PowerShell terminal with Windows pseudoconsole support.
- Added Git status, diff, stage, unstage, commit, and worktree inventory.
- Added guarded worktree creation and clean-worktree removal.
- Added local task, runtime, Python, and project skill panels.
- Added external editor, File Explorer, and Windows Terminal launch actions.
- Added a desktop content security policy.
- Split the editor and terminal engines from the startup bundle.
- Aligned the desktop and repository versions at 1.0.36.

#### Verification

- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting and compilation checks.
- Passed the repository text encoding and version checks.
- Verified the startup layout at 1280 by 720 with no browser console errors.
- Built and started the Windows release executable.
- Built the MSI and NSIS installers.

### [Session] 2026-08-11 - CODEXSUN application workspace layout

#### Database Changes

- Database update: No.
- Kept the existing Platform and NEOT migration order and database ownership.

#### App Codebase Changes

- Moved Platform API and web workspaces to `apps/platform`.
- Moved NEOT API and web workspaces to `apps/neot`.
- Moved the Tauri desktop workspace to `apps/neot/desktop`.
- Changed the root workspace pattern to `apps/*/*`.
- Kept Framework and UI in `packages`.
- Updated scripts, checks, tests, source paths, seed paths, and documentation.
- Removed the obsolete root `src` application tree.

#### Verification

- Passed repository-boundary, dependency-layout, module-boundary, and database-lifecycle checks.
- Passed all workspace TypeScript and lint checks.
- Passed the Framework test and package-contract suites.
- Passed the full production build for API, web, and desktop workspaces.
- Applied the MariaDB migration from `apps/platform/api`.
- Passed two composed API runtime smoke cycles.
- The aggregate check remains blocked by the unrelated deleted root `updat.sh` file.

### [Session] 2026-08-11 - Parent run task decomposition

#### Database Changes

- Database update: Yes.
- Added durable Agent tasks, task dependencies, and parent review records.
- Linked each scoped task to its parent run and optional child run.

#### App Codebase Changes

- Added validated acyclic task decomposition for parent Agent runs.
- Added dependency-ready task scheduling and explicit task states.
- Added agent profiles and normalized file scopes for each child task.
- Rejected parallel task starts when declared file scopes overlap.
- Created a durable child run and isolated worktree for each started writable task.
- Added parent review approval after all child tasks complete.
- Added a Task Graph panel with task state, scope, dispatch, completion, rework, and approval controls.
- Kept automatic sub-agent prompt execution as planned work.

#### Verification

- Passed the full repository check.
- Passed the full production build.
- Added isolated parallel child worktree coverage.
- Applied the additive migration to `neot_db`.
- Verified task creation and dependency release through the live Project Agent API and UI.
- Verified the Task Graph panel at a 1920 by 1080 viewport with no browser console errors.

## Unreleased - Trades conversion

- Renamed the standalone application and deployment surface to Trades.
- Retained Platform local users, roles, permissions, and assignments.
- Composed Deposit, Payment, Bank Account, and Commission from migration through UI.
- Removed the copied external sales and identity integration features.

### [Session] 2026-08-11 10:35 am - Project Agent quality gates

#### Database Changes

- Database update: Yes.
- Added verification, review, commit, and completion fields to Agent runs.
- Added durable Agent verification attempts with command, result, output, and duration evidence.

#### App Codebase Changes

- Added a shell-free registered verification command runner.
- Added a built-in Git whitespace and conflict check.
- Added environment-based command registration for project quality gates.
- Added repeatable verification attempts and a return-for-rework review state.
- Required all registered gates to pass before local commit approval.
- Added a worktree fingerprint that rejects changes made after a passed verification attempt.
- Added a two-step local commit approval in Run Control.
- Kept Agent commits local and disabled automatic remote pushes.
- Added quality-gate results, status, rework, and commit evidence to Run Control.

#### Verification

- Added executor tests for registered commands, missing executables, local commits, and branch retention.
- Added runtime smoke coverage for the verification command catalog.
- Added live Codex coverage for the read-only verification boundary.

### [Session] 2026-08-11 9:50 am - Isolated Project Agent executor

#### Database Changes

- Database update: Yes.
- Added workspace mode, status, source root, path, branch, revision, and cleanup fields to Agent runs.
- Added safe in-place column upgrades for an existing Agent run table.

#### App Codebase Changes

- Added one isolated Git branch and worktree for each writable Project Agent run.
- Kept Plan and read-only runs on the source checkout.
- Added repository allowlist and managed worktree root settings.
- Added runtime, tool-call, changed-file, and sub-agent budget enforcement.
- Added Codex turn interruption when a run exceeds a budget.
- Added workspace, branch, revision, and cleanup evidence to Run Control.
- Refused cleanup for active, unregistered, or dirty worktrees.
- Kept the run branch after clean worktree removal.

#### Verification

- Passed the full repository build.
- Passed the additive MariaDB migration and two API restart cycles.
- Passed the isolated worktree test with dirty cleanup refusal and branch retention.
- Passed a real Codex stream with durable history, workspace evidence, feedback, and actor isolation.
- Verified the Project Agent and Run Control layout at a 1920 by 1080 viewport.

### [Session] 2026-08-11 9:13 am - Durable Project Agent prototype

#### Database Changes

- Database update: Yes.
- Added Agent run, step, event, approval, artifact, and tool-call tables.
- Added actor and project indexes for Agent run history.
- Added foreign keys from runtime evidence to its owning Agent run.

#### App Codebase Changes

- Created one durable Agent run for each Codex turn.
- Added an explicit Agent run state machine.
- Added a provider-neutral tool catalog with access and risk metadata.
- Recorded Codex activity, approvals, changed files, completion, and failure evidence.
- Added actor-scoped Agent run list and detail APIs.
- Added the Project Agent Run Control lane with pipeline, budgets, approvals, activity, and files.
- Added a scale roadmap for worktrees, verification, delegation, models, nodes, and delivery.

#### Verification

- Added live end-to-end assertions for durable runs and actor isolation.
- Added runtime smoke assertions for the tool catalog.

### [Session] 2026-08-11 12:40 am - Skill Library references

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added the Skill Library workspace for repository-owned prompting and review knowledge.
- Added physical skill folders under `assist/skills/library`.
- Made `SKILL.md` an internal generated manifest and removed it from the file editor.
- Linked each user-managed reference file from the generated skill manifest.
- Added clear conflict errors for duplicate reference file names.
- Removed the floating Compact and Comfortable display control.
- Replaced manual reference file names with a local drive file picker.
- Copied selected Markdown content into the skill `references` folder without changing the source file.
- Limited imported reference files to 1 MB and kept duplicate uploads from overwriting existing files.
- Added the skill root to Agent IDE context so the agent can locate linked references.

#### Verification

- Passed NEOT API and web type checks, lint checks, and builds.
- Passed the module boundary check.
- Verified imported content, hidden manifest links, exports, and duplicate rejection with an isolated repository test.

## v-1.0.65

### [v 1.0.65] 2026-08-17 9:39 am - CodeLogix lazy startup

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.65.
- Rendered the CodeLogix chat shell before the app restores a recent workspace.
- Started Codex only after the first prompt or saved-task selection.
- Loaded chat history after the first paint and opened SQLite only when stored data is requested.
- Loaded Explorer, Git, Docker, terminal, updater, and system resources only when their views need them.
- Loaded Monaco only after the developer selects a file.
- Hid background Git and system command windows on Windows.
- Made dark mode the default for new installs and applied a neutral developer color palette.
- Split the desktop side panel into a separate lazy bundle.
- Added detailed GitHub Actions progress to the desktop release command.
- Ignored local Tauri state and performance profile files.

#### Verification

- Passed the desktop TypeScript check, ESLint check, 29 Vitest tests, and production build.
- Passed Rust formatting and compilation checks.
- Verified the native chat-first startup, deferred history, lazy Explorer, and on-demand Monaco behavior.
- Confirmed the idle desktop process did not start a Codex child process.
- Measured a 399 ms development-shell LCP with zero layout shift.

## v-1.0.64

### [v 1.0.64] 2026-08-16 12:52 am - Multi-provider Agent connector and response review

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.64.
- Added official SDK dependencies for OpenAI, Anthropic, OpenRouter, and OpenCode.
- Added DeepSeek through its OpenAI-compatible API contract.
- Kept native Codex and OpenAI as the default coding runtime and model provider.
- Added actor-scoped provider connections with encrypted API keys in MariaDB.
- Added provider configure, test, update, and disconnect API routes.
- Added collapsed provider cards to Agent Connector with model, capability, runtime, and status details.
- Added OpenCode CLI support for the provider-neutral coding bridge.
- Added response duration text and an edited-files review card to Project Agent replies.
- Kept provider credentials on the API server and out of browser responses and prompts.

#### Verification

- Passed NEOT API and web typechecks and lint checks.
- Passed NEOT API and Platform web production builds.
- Passed the module boundary and database lifecycle checks.
- Passed two API runtime smoke cycles.
- Applied the additive model-provider connection migration in local MariaDB.
- Verified Agent Connector controls and console output in the live browser.
- Verified the OpenCode CLI and SDK against a local server.
- Confirmed the SDK listed 185 providers and one connected provider.
- Recorded two moderate and one high dependency audit finding without applying an automatic fix.

## v-1.0.63

### [v 1.0.63] 2026-08-15 11:24 pm - Automated GitHub desktop release

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.63.
- Added `github:release` with dry-run, operator approval, and noninteractive reviewed modes.
- Required a clean, pushed `main` branch before a release tag can be created.
- Ran version, dependency, and desktop checks before pushing `desktop-v<version>`.
- Added resumable workflow monitoring and public release asset verification.
- Used slower public API polling when no GitHub token is available.
- Published the GitHub release only after the signed desktop workflow completes every build, test, output check, and asset upload.
- Added `github:release:test` for the tag and required release asset contracts.
- Fixed the Windows Node 26 command boundary so the release tool can run npm checks.
- Updated the version tool so the root lockfile keeps internal workspace dependency versions synchronized.
- Added a version check that rejects stale internal workspace dependencies in the root lockfile.
- Documented the automated release, timeout, and operator approval flow.

#### Verification

- Passed the GitHub release contract tests and JavaScript syntax check.
- Passed the release dry run without creating a tag or GitHub release.
- Verified that an uncommitted worktree stops before tag creation.
- Passed the full repository check and the CodeLogix desktop check.

## v-1.0.62

### [v 1.0.62] 2026-08-15 11:16 pm - Agent conversation and Markdown experience

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.62.
- Expanded the Agent transcript and composer to 80 percent of the available conversation workspace.
- Aligned developer prompts on the right and kept Agent responses on the left.
- Added a compact execution rail that keeps active work open, collapses completed work, and limits long activity lists with an explicit Show earlier actions control.
- Added safe GitHub-flavored Markdown for Agent headings, lists, task lists, tables, links, quotes, inline code, and fenced code blocks.
- Kept raw model-supplied HTML disabled and lazy-loaded Markdown rendering to protect startup performance.
- Added responsive and dark-theme presentation for messages, activity rails, and Markdown content.

#### Verification

- Passed desktop TypeScript, ESLint, 20 Vitest tests, and the version 1.0.62 production webview build.
- Passed all 11 native Rust tests for version 1.0.62.
- Confirmed the native single-instance guard focused the installed app instead of opening a competing development process.

## v-1.0.61

### [v 1.0.61] 2026-08-15 11:07 pm - Footer version update control

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.61.
- Added the installed CodeLogix version to the left side of the workspace footer.
- Made the version a keyboard-accessible update control that opens the signed update center and checks for a newer release.
- Preserved downloaded updates when the version control is clicked so approval remains available without another download.
- Added a restrained update-ready indicator with light and dark theme states.

#### Verification

- Passed desktop TypeScript, ESLint, 16 Vitest tests, and the production webview build.
- Passed repository version synchronization and diff checks.

## v-1.0.60

### [v 1.0.60] 2026-08-15 10:35 pm - Windows first-install and live update flow

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.60.
- Added a first-install setup EXE that embeds and starts the owned MSI.
- Kept MSI as the only Windows Installer product and updater package.
- Fixed the WiX upgrade code so future product-name changes cannot create duplicate installations.
- Added CODEXSUN publisher and product homepage metadata to the Windows installer.
- Published the setup EXE beside the MSI, updater signature, and direct-download manifest.
- Documented first installation, managed MSI deployment, repair, update, and uninstall ownership.

#### Verification

- Database update: not required.
- Passed version synchronization, type checks, lint, 14 Vitest tests, and the desktop production build.
- Passed all 11 native Rust tests and the signed MSI build.
- Passed the release-output check for the MSI identity, setup metadata, updater, and release manifest.
- Confirmed the setup EXE contains the MSI and excludes debug-symbol files.
- Passed repository encoding, deployment, boundary, dependency, database lifecycle, type, lint, and framework test gates.
- Live first-install and update verification continues after the signed GitHub draft passes its gates.

## v-1.0.59

### [v 1.0.59] 2026-08-15 10:13 pm - Direct-download desktop updates

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.59.
- Published the root-generated updater manifest with a direct versioned GitHub installer URL.
- Kept the signed MSI and signature creation in the official Tauri release action.
- Added an explicit release-manifest upload step after root deployment outputs are collected.

#### Verification

- Verified the published 1.0.58 updater endpoint returned HTTP 200 and exposed the signed installer metadata.
- Confirmed the Tauri-generated GitHub API asset URL required a binary request header that the current client does not send.
- Kept the public 1.0.58 release as an immutable audit record and moved the compatibility repair to 1.0.59.
- Passed version synchronization, desktop type checks, lint, 14 Vitest tests, the production build, and all 11 native Rust tests.

## v-1.0.58

### [v 1.0.58] 2026-08-15 9:50 pm - Reliable signed desktop release

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.58.
- Prepared the bundled Codex sidecar before native desktop tests in the Windows release workflow.
- Kept release tags immutable by issuing this fix as a new desktop version after the failed 1.0.57 CI run.

#### Verification

- Confirmed the 1.0.57 GitHub release run failed only because the native build could not find the prepared Windows Codex sidecar.
- Verified repository-owned package, Tauri, and Rust versions are synchronized at 1.0.58.
- Passed desktop type checks, lint, 14 Vitest tests, the production build, and all 11 native Rust tests.
- Built the 1.0.58 MSI and its 420-byte Tauri updater signature in the root deployment output.

## v-1.0.57

### [v 1.0.57] 2026-08-15 9:25 pm - CodeLogix internal coding beta

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.57.
- Combined the completed CodeLogix Agent, editor, Git review, and workspace safety changes.
- Added bounded file context, persistent Agent sessions, and safe prompt rollback.
- Added exact change fingerprints before stage and commit actions.
- Added stalled-turn recovery and generated-workspace filtering.
- Synchronized all repository and desktop version owners through the release tool.
- Kept the release scope at internal coding beta. A signed installer remains a separate release step.

#### Verification

- Passed the full repository policy, typecheck, lint, and framework test suite.
- Passed the NEOT API, Platform API, NEOT web, and CodeLogix production builds.
- Passed 14 desktop Vitest tests and 11 native Rust tests.
- Passed the repository version, formatting, and diff checks.
- Did not build or publish a signed installer in this release step.

## v-1.0.56

### [v 1.0.56] 2026-08-15 9:22 pm - Safe Agent prompt handoff

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.56.
- Prepared project learning and attached files before creating a durable user message.
- Blocked duplicate sends while CodeLogix prepares or submits a prompt.
- Added visible Preparing context and Sending states to the Agent composer.
- Restored the prompt when context preparation or Codex submission fails.
- Removed an unaccepted user message from local history after a failed Codex submission.
- Reported a separate error when local history cleanup fails.

#### Verification

- Passed the desktop TypeScript, ESLint, and 14 Vitest tests.
- Passed all 11 native Rust tests, including the local message rollback assertion.
- Passed the production build and native Rust compilation for version 1.0.56.
- Passed the repository version and diff checks.
- Did not send a live model request.

## v-1.0.55

### [v 1.0.55] 2026-08-15 9:15 pm - Persistent desktop Agent session

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.55.
- Kept the Agent session mounted while developers use Explorer and other workspace views.
- Preserved live Agent events, task state, and the connection across view changes.
- Started Monaco only after the developer first leaves the Agent view.
- Kept Monaco mounted after its first start to preserve open files and unsaved edits.
- Opened command-palette file results in Explorer.
- Reset the editor model when the selected workspace changes.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and production build.
- Verified persistent Agent and editor state in the native CodeLogix app.
- Passed the native Rust compilation and repository version checks.
- Did not send a model request or change the sample workspace.

## v-1.0.54

### [v 1.0.54] 2026-08-15 9:11 pm - One-thousand-line file context limit

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.54.
- Replaced the per-file character limit with a strict 1,000-line limit.
- Kept the three-file limit and the 24,000-character total prompt limit.
- Added a test that removes all content after line 1,000.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and the production build.
- Passed the native Rust compilation check.
- Passed the repository version consistency and diff checks.

## v-1.0.53

### [v 1.0.53] 2026-08-15 9:05 pm - Bounded IDE file context

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.53.
- Added explicit active-file attachments to the CodeLogix agent composer.
- Kept attached context while developers move between Explorer and Agent views.
- Limited each task to three attached saved files, 12,000 characters per file, and 24,000
  characters in total.
- Re-read attached files when a prompt is sent so the agent receives the current saved content.
- Marked truncated context and separated it from both approved project learning and the original
  user request.
- Told the agent to treat attached file content as untrusted reference data.
- Kept the original user message unchanged in durable task history.
- Added accessible context chips with individual removal and automatic clearing for a new task or
  workspace.

#### Verification

- Passed desktop TypeScript, ESLint, 14 Vitest tests, and the production build.
- Passed Rust formatting, 11 Rust tests, and Rust compilation checks.
- Passed the repository version and diff checks for version 1.0.53.
- Verified the native CodeLogix app with the live sample workspace.
- Selected `README.md` in Explorer, attached it in Agent, confirmed the chip persisted after moving
  between views, and removed it successfully.
- Did not send the attached sample to a model, stage files, or create a commit.

## v-1.0.52

### [v 1.0.52] 2026-08-15 8:48 pm - Desktop live workflow hardening

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.52.
- Synchronized the npm workspace, Tauri configuration, Rust manifest, and Rust lockfile versions.
- Extended the release tool to check and update every desktop version owner.
- Added one shared policy that hides generated workspace roots from Explorer, fallback search, and
  untracked Source Control results.
- Kept tracked generated files visible so existing repository content cannot be hidden accidentally.
- Added a content fingerprint and explicit review approval before staging or committing changes.
- Invalidated change approval when the reviewed workspace content changes.
- Added a one-minute stalled-turn warning and a bounded three-minute automatic interruption.
- Renamed the environment file count to `Root entries` so the UI describes the loaded data correctly.
- Added focused tests for generated-path policy, review matching, and stalled-turn recovery.

#### Verification

- Passed the desktop TypeScript, ESLint, Vitest, and production build checks.
- Passed Rust formatting, 11 Rust tests, and Rust compilation checks.
- Passed the repository version check for version 1.0.52.
- Verified the native CodeLogix app against the live sample workspace.
- Confirmed the live Source Control panel hides untracked `dist`, shows the three authored changes,
  disables staging before review, and unlocks staging after approving the exact content.
- Did not stage or commit the sample project changes.

## v-1.0.51

### [v 1.0.51] 2026-08-15 8:13 pm - Named delegate restart recovery

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.51.
- Added one-time recovery for running named delegates after an API process restart.
- Started recovery only inside an authenticated request database and actor context.
- Reused each task's existing child run, worktree, scope, profile, model, and access ceiling.
- Started a new Codex thread and turn for each recovered delegate.
- Closed stale pending approval records before the replacement turn started.
- Added `run.recovered` child events and `run.task.recovered` parent events.
- Made executor startup failures finish the durable task instead of leaving it stuck in `running`.
- Extended the isolated named Agent E2E test to restart the API after parallel task dispatch.

#### Verification

- Passed the NEOT API TypeScript and ESLint checks.
- Built the NEOT API and Platform API packages.
- Passed the live named Agent E2E against MariaDB and the real Codex App Server.
- Replaced the API process while Forge and Canvas were running.
- Verified both delegates resumed in their existing worktrees and changed only assigned files.
- Verified both child runs and the parent run stored recovery events.
- Verified Atlas completed the dependency-final review after recovery.
- Verified the final human parent approval completed the recovered graph.

## v-1.0.50

### [v 1.0.50] 2026-08-15 7:37 pm - Named supervisor and delegate execution

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.50.
- Added actor-owned named Agent personas with supervisor and delegate roles.
- Added an explicit starter team that users can create and rename from Project Agent.
- Persisted supervisor selection on parent runs and delegate assignment on graph tasks.
- Changed task start into real Codex delegate execution inside the task-owned worktree.
- Added profile-based permission ceilings for planning, review, and security delegates.
- Enforced task file scopes after execution and failed delegates that changed unrelated paths.
- Added durable child activity, file, approval, result, and failure evidence.
- Added dependency evidence and child-worktree locations to the final supervisor review task.
- Added inline delegate approval controls while keeping human parent approval as the final gate.
- Fixed auto-approve sessions so Codex file and command approval requests are accepted only for
  that explicit access mode.
- Made the assigned child task authoritative instead of inheriting one-turn parent chat commands.
- Failed write-oriented delegates that report completion without producing a scoped file change.
- Persisted inspected worktree files as durable artifacts even when a streaming diff event is missed.
- Restored the selected Project Agent project after a browser reload.
- Added a repeatable named Agent team E2E test with an isolated temporary Git repository.

#### Verification

- Passed NEOT API and web TypeScript checks.
- Passed NEOT API and web ESLint checks.
- Passed database lifecycle and module boundary checks.
- Applied `neot.agent-personas.sql.v1` to the live local MariaDB database.
- Verified the named team and assignment controls in the live Project Agent browser workspace.
- Created Atlas, Scout, Forge, Canvas, and Sentinel through the user action and persisted a
  supervised four-task graph.
- Called Scout from the graph and verified its durable child run advanced through planning,
  running, and completed before unlocking the dependent Forge and Canvas tasks.
- Passed the isolated named Agent team E2E against the built API, live MariaDB, and real Codex App
  Server: Forge and Canvas ran in parallel worktrees, changed only their assigned files, persisted
  artifacts, unlocked Atlas, completed the read-only supervisor review, and accepted final human
  approval.
- Verified an incompatible supervisor-to-coding-task assignment returns a conflict without changing
  the valid delegate.
- Created the supervised four-task graph from the live browser UI and confirmed the selected project,
  Atlas team, graph, and run control survive a full reload with no browser console errors.
- Did not run write-capable delegates against the dirty development checkout; all write E2E work used
  the temporary Git fixture.

## v-1.0.49

### [v 1.0.49] 2026-08-15 6:53 pm - Root deploy output collection

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.49.
- Added one root desktop deployment folder under `dist/deploy/desktop/<version>/windows-x64`.
- Collected the runnable CodeLogix executable and the complete Codex runtime under the `app` folder.
- Bundled the Codex code-mode host, Windows sandbox setup, sandbox command runner, and ripgrep beside `codex.exe`.
- Added the bundled runtime directory to the Codex process path so tool and sandbox helpers resolve in development and installed builds.
- Made `CODELOGIX_WORKSPACE` take precedence over the remembered workspace for deterministic development and automated live tests.
- Removed the unsupported `excludeTurns` field when resuming persisted Codex App Server threads.
- Collected the MSI and updater signature under the `installer` folder.
- Generated a local Tauri `latest.json` updater manifest under the `updater` folder.
- Generated SHA-256 checksums and a machine-readable release manifest for every deployable file.
- Added a standalone publish command for an existing native release build.
- Made the signed release command check the root-only dependency and build-output boundary first.
- Added the root deploy folder to the GitHub Actions artifact output.
- Kept compiler caches under Tauri `target` while exposing deployable files only from root `dist`.
- Removed workspace-local `node_modules` folders and restored the repository root-only layout.

#### Verification

- Passed the repository root dependency and build-output boundary check.
- Published and inspected the complete desktop release folder from an existing build.
- Verified the release manifest, updater manifest, file sizes, and SHA-256 checksums.
- Ran CodeLogix against an isolated Git repository with a known failing test.
- Verified the live agent read `AGENTS.md`, reproduced the failure, edited only `src/cart.js`, passed the test, refreshed Git status, displayed the diff, persisted the task, and resumed it after restart.
- Reproduced missing Codex tool and sandbox helpers in the live application, bundled the required executables, and repeated the coding task through the Windows workspace-write sandbox without fallback approvals.
- Rebuilt the 1.0.49 MSI and Tauri updater signature after the runtime repair; the MSI SHA-256 is `3504bd00d797d89ca6d7134d112afb926959b86d8510618b7763ba53712c6794`.
- Verified every release-manifest byte count and SHA-256 digest. The MSI has a valid Tauri updater signature but is not yet Authenticode-signed by a Windows publisher certificate.

## v-1.0.48

### [v 1.0.48] 2026-08-15 6:42 pm - Reviewed project learning loop

#### Database Changes

- MariaDB update: No.
- Added desktop SQLite migration `0003_project_learning.sql`.
- Added workspace learning settings and reviewed project facts with evidence and status.

#### App Codebase Changes

- Bumped repository version to 1.0.48.
- Added a Project learning activity beside the Agent and Explorer activities.
- Detected facts from repository instructions, manifests, project paths, and skill roots.
- Required approval before a detected fact can enter the coding-agent context.
- Added rejection, approval reversal, automatic evidence rechecks, and stale-fact status.
- Returned changed approved facts to review before the agent can use them again.
- Kept the original user message in task history while sending approved facts in a separate context block.
- Added settings to disable context use or automatic rechecks for each workspace.
- Kept project learning local to the desktop SQLite database.
- Prevented the learning loop from editing project files, skills, instructions, or CodeLogix code.

#### Verification

- Passed desktop TypeScript, ESLint, Vitest, and production build checks.
- Passed 5 frontend tests across 2 test files.
- Passed 8 native tests, including approval, context, evidence detection, and stale-fact behavior.
- Verified the Project learning activity, detected evidence, settings, counts, and review controls in the native application.
- Built the CodeLogix 1.0.48 Windows MSI and its 420-byte Tauri updater signature.
- Recorded MSI SHA-256 `7FDF0831AFE4D5DB5C65B99257DA45D66EFBC94C4E94D5413C8CD03992492CC2`.
- Confirmed that the updater is signed while the MSI itself remains without an Authenticode certificate.

## v-1.0.47

### [v 1.0.47] 2026-08-15 6:26 pm - Agent IDE toolchain foundation

#### Database Changes

- Database update: No.
- MariaDB schema update: No.
- Desktop SQLite schema update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.47.
- Audited the proposed agent IDE toolset against the existing NEOT owners and runtime boundaries.
- Added direct Zustand state management for desktop shell navigation, drawers, terminal visibility, command palette, and update center state.
- Added Zod validation at the Codex event boundary so malformed native payloads do not enter the React agent session.
- Added Vitest coverage for valid messages, malformed events, thread extraction, and tool activity normalization.
- Changed repository text search to prefer ripgrep JSON output with bounded results and a native recursive fallback when ripgrep is unavailable.
- Added ripgrep capability reporting to the local runtime panel.
- Documented the current, next, and deferred owners for MCP, LSP, Tree-sitter, vector search, LangGraph, model adapters, Docker, GitHub, jobs, realtime events, and observability.
- Kept BullMQ and Redis in the API delivery layer instead of adding them to the local desktop process.
- Deferred unused LangChain, LangGraph, language server, Tree-sitter, vector database, OpenTelemetry, and extra provider SDK dependencies until their owning services and acceptance tests are implemented.

#### Verification

- Installed the desktop dependencies with zero reported npm vulnerabilities.
- Passed desktop TypeScript, ESLint, Vitest, and production build checks.
- Passed 3 desktop protocol tests.
- Passed Rust formatting, compilation, and 5 native library tests.
- Detected ripgrep 15.1.0 in the local runtime.
- Passed repository version consistency and whitespace checks.
- Built the CodeLogix 1.0.47 Windows MSI and its 420-byte Tauri updater signature.
- Recorded MSI SHA-256 `84BAAEA8A6DA5A857CACAA91902B9D88B71856D31773DC2306F98C5121251BF7`.
- Confirmed that the updater is signed while the MSI itself remains without an Authenticode certificate.

## v-1.0.46

### [v 1.0.46] 2026-08-15 6:14 pm - Durable CodeLogix agent tasks

#### Database Changes

- MariaDB update: No.
- Added the additive desktop SQLite migration `0002_agent_history.sql` for workspace-scoped
  agent tasks and message transcripts.

#### App Codebase Changes

- Bumped repository version to 1.0.46.
- Added native task and message persistence commands owned by the desktop runtime.
- Persisted task titles, Codex thread identifiers, access modes, timestamps, and full user/agent
  messages in the local desktop database.
- Added Recent tasks with an accessible empty state, active state, relative time, and guarded task
  switching while an agent is running.
- Reconnected saved tasks through the Codex App Server `thread/resume` contract.
- Restored the most recent workspace task and transcript when CodeLogix opens.
- Kept agent protocol parsing, session orchestration, and presentation in focused owner files.

#### Verification

- Passed desktop TypeScript and ESLint checks.
- Passed 4 Rust tests, including workspace-scoped task and message persistence.
- Verified the native CodeLogix window renders Recent tasks and keeps Codex connected.
- Verified the implementation against the generated schema from the bundled Codex App Server.
- Did not send an external Codex test prompt during UI verification.
- Built the CodeLogix 1.0.46 Windows MSI and updater signature without installing it.

## v-1.0.45

### [v 1.0.45] 2026-08-15 5:59 pm - Fast local-first CodeLogix startup

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.45.
- Replaced the sequential desktop startup waterfall with an immediate local-first workspace shell.
- Warmed one shared Codex runtime in the background and reused its startup promise across callers.
- Restored the recent workspace before Git status and file indexing finish.
- Loaded Git changes and workspace files concurrently with stale-result protection.
- Deferred Monaco and its language workers until the user opens Explorer.
- Added compact, non-blocking readiness states for agent startup, source control, file indexing, and
  workspace opening.
- Extracted desktop session orchestration and side-panel composition from the main shell.

#### Verification

- Passed the desktop TypeScript and ESLint checks after the startup refactor.
- Passed the desktop production build, Rust formatting, 3 Rust tests, and Rust compilation.
- Passed repository version consistency and whitespace validation.
- Verified the native CodeLogix window restores the NEOT workspace and connects to Codex.
- Verified Explorer remains the second activity and triggers the deferred editor load.
- Verified `package.json` opens and renders in the embedded Monaco editor.
- Built the CodeLogix 1.0.45 Windows MSI and updater signature without installing it.

## v-1.0.44

### [v 1.0.44] 2026-08-14 10:35 am - Agent-first CodeLogix workspace

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.44.
- Made Agent the first and default desktop activity and moved Explorer to the second position.
- Added a Codex-style task history rail, focused conversation surface, and environment inspector.
- Added a native Codex App Server process bridge using the stable JSON-RPC thread and turn flow.
- Bundled the platform Codex engine as a Tauri sidecar so the installed app does not depend on a
  separately executable Windows Store binary.
- Added streamed Agent replies, command and file activity, unified diff evidence, and run status.
- Added workspace-write and read-only modes with network access disabled by default.
- Added command and file approval cards with allow-once, allow-for-task, and decline decisions.
- Added turn interruption, new-task creation, starter prompts, Git context, and direct file opening.
- Kept the integrated terminal, editor, Git worktrees, search, tasks, skills, Docker, and updater.
- Reopen the most recent valid workspace automatically and support `CODELOGIX_WORKSPACE` for a
  deterministic local launch.

#### Verification

- Passed desktop TypeScript and ESLint checks.
- Passed the desktop Vite production build with locally bundled Monaco workers.
- Passed Rust compilation for the Tauri App Server bridge.
- Passed three Rust library tests for Git worktree names and workspace-local Python environments.
- Launched the native CodeLogix window and verified workspace loading, the agent-first layout, and
  Explorer in the second activity position.
- Verified a live Codex App Server turn returned `This workspace is NEOT.` without changing files.
- Built the `CodeLogix_1.0.44_x64_en-US.msi` installer and its Tauri updater signature with the
  bundled Codex engine.

## v-1.0.43

### [v 1.0.43] 2026-08-14 10:10 am - CodeLogix navigation drawer and local editor

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.43.
- Replaced the floating view toggle with the application drawer and repaired local file editing.

## v-1.0.42

### [v 1.0.42] 2026-08-14 9:53 am - CodeLogix package identity

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.42.
- Changed the package display name to CodeLogix and removed the application logo border.

## v-1.0.41

### [v 1.0.41] 2026-08-14 9:43 am - NEOT desktop application icon

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.41.
- Replaced all generated Tauri platform icons with the blue NEOT Desktop application mark.

## v-1.0.40

### [v 1.0.40] 2026-08-14 8:54 am - Signed desktop updater and MSI lifecycle

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.40.

## v-1.0.39

### [v 1.0.39] 2026-08-14 8:36 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.39.

## v-1.0.38

### [v 1.0.38] 2026-08-14 8:30 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.38.

## v-1.0.37

### [v 1.0.37] 2026-08-14 8:17 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.37.

## v-1.0.36

### [v 1.0.36] 2026-08-14 8:07 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.36.

## v-1.0.35

### [v 1.0.35] 2026-08-13 8:09 am - Secure dependencies and automatic watcher execution

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.35.

## v-1.0.34

### [v 1.0.34] 2026-08-13 2:01 am - Honey voice chat and history controls

#### Database Changes

- Database update: No.
- Used the existing Honey thread status field to retain archived conversations.

#### App Codebase Changes

- Bumped repository version to 1.0.34.
- Sent completed mascot voice transcripts to the persisted Honey chat service.
- Added listening, thinking, success, and error reactions for mascot voice requests.
- Opened the three-message quick chat after Honey answers a mascot voice request.
- Hid the welcome balloon while quick chat is open.
- Limited the welcome balloon to one display per browser tab session.
- Kept Honey above the Documentation navigation and anchored it near the top of the menu.
- Added an accessible archive action on hover and keyboard focus for each chat history row.
- Removed archived conversations from active history without deleting their messages.

#### Verification

- Passed the NEOT API and web TypeScript checks.
- Passed the NEOT API and web lint checks.
- Passed the UI TypeScript and lint checks.
- Passed the Honey mascot Playwright test for voice chat and hover behavior.
- Passed the repository version consistency check.

## v-1.0.33

### [v 1.0.33] 2026-08-13 12:20 am - Production watcher configuration backup safety

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.33.

## v-1.0.32

### [v 1.0.32] 2026-08-12 8:45 pm - version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.32.

## v-1.0.31

### [v 1.0.31] 2026-08-12 8:37 pm - Local-first sync and production update watcher

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.31.

## v-1.0.30

### [v 1.0.30] 2026-08-12 12:37 pm - MariaDB deployment backup compatibility

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.30.
- Prevented `mariadb-dump` from loading unsupported client defaults during deployment backups.

#### Verification

- Passed the deployment script check and version check.
- Confirmed the failed `1.0.29` update did not replace the running containers.

## v-1.0.29

### [v 1.0.29] 2026-08-12 12:25 pm - Hostinger SSH connection

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.29.
- Added a module-owned Hostinger SSH key generator and connection tester.
- Kept each private key in NEOT storage and sent only its public key to Hostinger.
- Added Hostinger VPS address discovery, attachment status, fingerprints, and connection evidence.
- Added the Hostinger SSH connection panel with key generation and live test controls.
- Used the installed Hostinger MCP package directly to avoid a slow command launcher.
- Restored the `updat.sh` compatibility alias required by the deployment check.

#### Verification

- Passed the NEOT API and web type checks and lint checks.
- Passed the module boundary check and Git diff validation.
- Created and attached the Ed25519 public key to VPS `914719`.
- Connected to `srv914719` as `root` and verified `/home/neot` exists.

## v-1.0.28

### [v 1.0.28] 2026-08-12 11:49 am - Honey assistant, Telegram connection, and deployment runtime

#### Database Changes

- Database update: Yes.
- Published the Honey persistence and Telegram MTProto migrations described in the v 1.0.27 preparation record below.

#### App Codebase Changes

- Bumped repository version to 1.0.28.
- Published the complete Honey, Telegram, Hostinger, Project Agent, dashboard, navigation, branding, and container runtime change set.
- Kept the detailed codebase and verification record in the adjacent v 1.0.27 preparation entry.

## v-1.0.27

### [v 1.0.27] 2026-08-12 11:47 am - Honey assistant, Telegram connection, and deployment runtime

#### Database Changes

- Database update: Yes.
- Added actor-owned Honey conversation, message, and reviewed-memory tables.
- Added encrypted Telegram MTProto session fields and an authentication mode field.
- Kept the Honey and Telegram migrations additive and repeatable.

#### App Codebase Changes

- Bumped repository version to 1.0.27.
- Added the Honey assistant API, chat workspace, conversation history, reviewed memory, business knowledge, and provider-neutral Codex gateway.
- Added context-aware Honey action cards for projects, tasks, Project Agent, error help, and deployment review.
- Added Honey voice input with automatic submission after speech ends.
- Added the Honey mascot with smooth roaming, drag placement, stay mode, voice status, conversation reactions, and visibility controls.
- Added Honey links to the application menus and the Project Agent header.
- Added browser-based Telegram account connection with QR, phone, code, password, and encrypted session flows.
- Added Telegram task controls, chat, notifications, connection guidance, and environment settings.
- Added Hostinger MCP status, reload, metrics, Docker inventory, and detail workspaces.
- Added App Desk, dashboard, work overview, My Work, and compact work navigation surfaces.
- Updated the Project Agent panels, project context, run controls, and workspace layout.
- Updated NEOT application branding, global search, app menus, user menus, side panels, and responsive layout behavior.
- Added persistent Codex state, repository, and worktree volumes to the container runtime.
- Added Git and unprivileged Agent runtime checks to setup and update scripts.
- Updated deployment documentation, environment templates, package contracts, and module-boundary checks.

#### Verification

- Passed the Honey action resolver regression.
- Passed both Honey mascot and voice browser tests.
- Passed focused NEOT API, NEOT web, UI, and Platform checks during implementation.
- Passed the module-boundary and version consistency checks.
- Passed the full repository typecheck, lint, Framework test, and production build.
- The aggregate check remains blocked because the deployment check still requires the removed root `updat.sh` file.

## v-1.0.26

### [v 1.0.26] 2026-08-12 11:29 am - Project Agent workspace navigation

#### Database Changes

- Database update: No.
- Kept the existing Project Agent chat, run, and project persistence contracts.

#### App Codebase Changes

- Bumped the repository and all workspace packages to 1.0.26.
- Added slim scrollbars to the Chat History and Run Control panels.
- Added accessible show and hide controls to both side panels.
- Moved the Run Control toggle to the left and improved its header spacing.
- Changed the left panel to show chat history without duplicate project details.
- Kept the selected project when a user opens an older chat history record.
- Moved project details into a compact dropdown in the Project Agent header.
- Changed the Project Agent heading to the selected project title.
- Matched the project information dropdown position and width to the Chat History panel.
- Added project status, access, model, description, module, reference, and conversation details.
- Removed stored HTML tags from project descriptions before display.
- Added an Agents side-menu group with Project Agent, Agent Connector, and Skills links.
- Renamed the existing Codex Runtime user interface to Agent Connector.

#### Verification

- Passed the NEOT web TypeScript and lint checks.
- Passed the Platform web TypeScript and lint checks.
- Passed the Git whitespace check for the changed Project Agent files.
- Verified project selection, chat history switching, panel controls, and the project information dropdown in a live browser.
- Verified a live read-only Project Agent reply for project `PRJ-0001`.
- Verified that the project information dropdown and Chat History panel both use a 288 px width.
- Verified that the browser console reported no errors during the interaction checks.

## v-1.0.25

### [v 1.0.25] 2026-08-11 5:04 pm - Repository connection catalog and workspace mapping

#### Database Changes

- Database update: Yes.
- Added the `neot_repository_connections` table.
- Added repository display names, provider types, private base URLs, repository paths, and availability states.
- Applied the `neot.project-manager.sql.v7` migration to `neot_db`.

#### App Codebase Changes

- Bumped the repository and all workspace packages to 1.0.25.
- Added a Repository Connections settings page for GitHub and private Git repositories.
- Added support for multiple named repository connections.
- Kept Git base URLs in the settings page and removed them from the developer workspace flow.
- Changed project workspace setup to use local folders or approved repository names.
- Added a native Windows folder picker for local repositories and clone destinations.
- Added repository configuration and developer-safe repository list API routes.
- Added repository mapping, Git status, branch, changed-file, and package-version information.
- Kept repository cloning under Project Agent approval.

#### Verification

- Passed all workspace TypeScript and lint checks.
- Passed the full production build for the API, web, and desktop workspaces.
- Passed the database lifecycle check.
- Passed two composed API runtime smoke cycles.
- Passed the repository text encoding and Git diff checks.

## v-1.0.24

### [v 1.0.24] 2026-08-11 3:00 pm - Remove legacy business modules

#### Database Changes

- Database update: No.
- Kept existing database tables and records unchanged.

#### App Codebase Changes

- Removed the Deposit, Payment, Commission, Bank Account, and Trades Overview module surfaces.
- Kept only identity modules in the Platform API and web module roots.
- Renamed the host database, login, JWT, health, release, and SSH contracts to NEOT or Platform names.
- Removed unused compatibility clients, request context code, form code, and obsolete queue test code.
- Removed the Project Manager and Task Manager JSON seed databases and their boot-time import code.
- Made both modules start with empty MariaDB tables and use their APIs for all new records.
- Updated module boundaries, database lifecycle checks, package documentation, and project inventory.
- Bumped the repository and all workspace packages to 1.0.24.

#### Verification

- Passed the module-boundary and database-lifecycle checks.
- Passed all workspace TypeScript checks.
- Passed the Framework tests and package-contract checks.
- Passed the production build.
- Passed two composed API runtime smoke cycles.
- Confirmed that active source and tooling contain no removed module references.
- Confirmed that no Project Manager or Task Manager JSON database references remain.

## v-1.0.23

### [v 1.0.23] 2026-08-11 10:16 am - Project Agent execution and quality gates

#### Database Changes

- Database update: Yes.
- Added durable Agent runs, steps, events, approvals, artifacts, tool calls, and verification attempts.
- Added workspace, branch, revision, cleanup, verification, review, fingerprint, and commit state to Agent runs.
- Kept the migration additive for existing MariaDB installations.

#### App Codebase Changes

- Bumped repository version to 1.0.23.
- Added project-aware Codex chat with actor-isolated history, feedback, attachments, access modes, and streamed activity.
- Added an isolated Git branch and worktree for each writable Agent run.
- Kept Plan and read-only runs on the source checkout.
- Added repository allowlists, managed worktree storage, cleanup guards, and retained review branches.
- Added runtime, tool-call, changed-file, and sub-agent budgets with Codex turn interruption.
- Added shell-free registered quality gates with repeatable attempts and durable command evidence.
- Added return-for-rework state and a worktree fingerprint that blocks stale commit approval.
- Added a two-step human approval before local commits and kept all remote pushes manual.
- Added Run Control views for pipeline, workspace, approvals, activity, files, verification, review, and commit evidence.
- Added the Skill Library with hidden generated manifests, linked reference files, and local drive imports.
- Matched the CXApp `github:now` review flow with changelog subjects, optional version bump, Windows dialogs, and final Git confirmation.

#### Verification

- Passed the full repository build and repository check suite.
- Passed the additive MariaDB migration and two API restart cycles.
- Passed executor tests for isolation, budgets, registered commands, fingerprints, local commits, cleanup, and branch retention.
- Passed a real Codex stream with durable history, feedback, workspace evidence, and actor isolation.
- Verified Project Agent and Run Control at a 1920 by 1080 browser viewport.
- Passed the CXApp-pattern `github:now` dry run without Git mutation.

## v-1.0.22

### [v 1.0.22] 2026-08-01 1:54 pm - Version update

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.22.

## v-1.0.21

### [v 1.0.21] 2026-07-31 7:00 pm - Version update

#### Database Changes

- Database update: Yes.
- Consolidated generated `LEG-*` bank-account chains into their canonical accounts,
  preserving Deposit, Payment, ledger, and transfer links.

#### App Codebase Changes

- Bumped repository version to 1.0.21.
- Prevented linked Deposit and Payment bank labels from being re-imported as new
  legacy accounts during repeatable seeds, and normalized existing account links.

## v-1.0.20

### [v 1.0.20] 2026-07-31 6:04 pm - Version update

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.20.
- Made Verify and Settle reversible, icon-only controls in the final list columns
  across Deposits, Payments, and Commissions, with immediate toggling and no confirmation popup.

## v-1.0.19

### [v 1.0.19] 2026-07-31 1:59 pm - Transaction identity and dependency refresh

#### Database Changes

- Database update: Yes.
- Made Deposit, Payment, and generated Commission names and references optional.
- Moved Deposit and Payment uniqueness from reference values to normalized TG codes,
  with migration guards for blank or duplicate persisted codes.
- Added in-place verification and settlement lifecycle columns for existing Deposit,
  Payment, and Commission records; existing rows default to not verified and not settled.

#### App Codebase Changes

- Bumped the repository and all Trades-owned workspace packages to 1.0.19.
- Updated Deposit, Payment, and Commission API and web behavior to handle optional
  names and references while retaining TG-code fallbacks in lists, messages, and ledger entries.
- Made Trades Overview the landing workspace for every authenticated user while
  preserving administrator access to Platform identity settings.
- Refreshed the Node, Fastify, React, UI, editor, and TypeScript tooling dependencies.
- Adapted the shared workspace editors to the TipTap 3 extension and content-update APIs.

## v-1.0.18

### [v 1.0.18] 2026-07-31 5:42 am - deploment rework

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.18.

## v-1.0.17

### [v 1.0.17] 2026-07-30 11:22 pm - Trades conversion and CRUD stabilization

#### Database Changes

- Database update: Yes.
- Added and seeded the complete Trades permissions used by Bank Account, Deposit,
  Payment, ledger, reconciliation, and Commission lifecycle operations.
- Assigned the Trades business permissions to the local Platform roles.
- Verified the ordered Platform identity and Trades module migrations against
  `trades_db`.

#### App Codebase Changes

- Bumped repository version to 1.0.17.
- Corrected the Trades web client base URL to route requests through
  `/api/platform`.
- Removed the Frappe-dependent authentication path in favor of local Platform
  authentication and development auto-login.
- Stabilized the Vite React Refresh preamble used by the development loader.
- Verified create, list, read, update, activate, deactivate, settlement, statement,
  and force-delete behavior for Bank Accounts, Deposits, Payments, ledger entries,
  and Commissions.
- Confirmed that the CRUD verification removed its temporary records and restored
  the edited Commission variant.
