# Project Inventory

## Executable Platform

- `apps/platform/api`: Fastify server, local authentication, identity modules, MariaDB connection,
  and NEOT API composition.
- `apps/platform/web`: React application shell, login, identity administration, and NEOT web
  bundle composition.

## NEOT Owner Workspaces

- `apps/neot/api`: Project Manager, Task Manager, Planning, GitHub Dashboard, Orchestration,
  Skills, Sync, Notifications, MariaDB lifecycle, and public host contracts.
- `apps/neot/web`: Today, Projects, Tasks, Platform Registry, Whiteboards, GitHub Dashboard,
  Engineering Command Center, Project Agent, Skill Library, Design System, MDX Documentation,
  Work Hub, and Sync workspaces.
- `assist/skills/library`: Repository-owned physical skill folders used for Agent prompting and
  review workflows. NEOT generates the hidden `SKILL.md` manifest and links each user-managed
  reference file from it so agents can load the relevant knowledge progressively.
- `apps/neot/desktop`: Tauri and React local IDE with a bundled Codex runtime, Monaco, Zustand
  shell state, Zod protocol validation, ripgrep-first search, Git, terminal, SQLite, and signed
  Windows updates. The desktop also owns reviewed project learning from repository evidence.
  Only approved and current facts enter the agent context. Developers may explicitly attach up to
  three saved workspace files to a task. Each file supplies no more than 1,000 lines, and all files
  share a 24,000-character prompt limit. Attachments remain separate from the durable user message
  and are re-read only when the prompt is sent. The Agent session stays mounted across workspace
  views. Monaco starts on its first use and then stays mounted for the selected workspace. Prompt
  preparation blocks duplicate sends and removes local user messages that Codex does not accept.
- Orchestration owns MariaDB-backed Project Agent chat threads, messages, action history,
  edited-file evidence, elapsed time, and feedback. Action history records commands, tools,
  searches, file changes, delegates, and automatic Codex context compaction. Every chat-history
  query is partitioned by the authenticated local actor ID. This is scoped record isolation, not
  platform-wide multi-tenant isolation.
- Orchestration also owns durable Agent runs, steps, events, approvals, artifacts, and observed tool
  calls. The Project Agent Run Control lane shows this evidence for the selected project.
- Orchestration owns the local Git worktree executor. Writable runs use isolated branches under the
  managed worktree root. Cleanup rejects dirty worktrees and keeps each branch for review.
- Orchestration owns two isolated Codex connector slots. Each slot has a separate credential home
  and App Server process. Chats record their connector, and parallel delegates rotate across
  connected slots while retaining isolated worktrees.
- Orchestration owns parent task graphs, task dependencies, agent profiles, file scopes, child runs,
  child worktrees, and parent review evidence. The scheduler starts only dependency-ready tasks and
  rejects concurrent scopes that overlap.
- Orchestration owns the Hostinger VPS MCP connection status and managed private-Codex
  configuration. It also owns the read-only VPS metrics and Docker inventory dashboard.
  `HOSTINGER_API_TOKEN` remains server-side and is forwarded by name at runtime.
- Orchestration owns registered verification commands, verification attempts, rework state, and
  approved local commits. It does not push Agent branches.
- Sync owns encrypted local-to-cloud bindings, cloud acceptance tokens, revisioned snapshots,
  checksums, conflict records, and manual two-way transfer with `https://neot.in`.
  Projects, tasks, planning records, registry documentation, activity, and project attachments can
  synchronize. Repositories, worktrees, environment files, builds, Docker images, and provider
  secrets remain local.
- Notifications owns the durable inbox and database delivery queue. BullMQ and Redis accelerate
  delivery but do not replace MariaDB. The module owns retries, dead letters, SMTP delivery,
  Socket.IO events, queue inspection, and failed-job retry.

## Shared Dependencies

- `packages/framework`: backend infrastructure and public module contracts.
- `packages/ui`: React components, layouts, and workspace primitives.

The Platform module roots contain identity owners only. Proprietary business application sources
remain in their own repositories. Only repository-root `node_modules` and `dist` directories are
permitted. Desktop releases publish under `dist/deploy/desktop/<version>/windows-x64`.
