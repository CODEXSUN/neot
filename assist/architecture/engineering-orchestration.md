# Engineering Orchestration

The longer-term local-first, hybrid, multi-node platform design is recorded in
`future-platform-blueprint.md`. That blueprint is planned work; the current-state boundaries in
this document remain authoritative until individual phases are approved and implemented.

## Naming Contract

NEOT is the external product and brand label. `neot` is the internal technical name and is
not renamed. The stable technical contract includes workspace packages, `/app/neot/*` browser
routes, `/api/neot/*` API routes, `neot.*` permissions, `NEOT_*` environment keys, database
objects, module keys, storage paths, and deployment resource names.

## Current Product Boundary

The current application is a standalone, single-client modular monolith backed by one MariaDB
database. Platform owns authentication, identity, executable servers, database connection, and
composition. NEOT modules own all engineering product behavior.

The current orchestration slice provides these implemented controls:

- the Engineering Command Center combines live project, task, review, repository, and check
  signals already owned by NEOT;
- the orchestration API publishes schema-validated lifecycle stages, Assist modes, initial agent
  profiles, permission ceilings, and human-approval boundaries;
- each Codex turn creates a durable Agent run with actor and project ownership;
- a parent run owns a durable task graph with dependency and file-scope contracts;
- dependency-ready child tasks create durable child runs and isolated Git worktrees;
- parallel task dispatch rejects overlapping declared file scopes;
- the parent review gate accepts a graph only after every child task completes;
- Agent runs record steps, events, observed tool activity, approvals, changed-file artifacts,
  budgets, results, and failures;
- the Project Agent shows persisted run state and evidence beside the chat;
- writable runs use isolated Git worktrees under a managed runtime root;
- Plan and read-only runs stay on the source checkout;
- the executor limits repository roots through `NEOT_AGENT_ALLOWED_ROOTS`;
- NEOT interrupts Codex when a run exceeds its time, tool, file, or sub-agent budget;
- reviewers can remove a clean terminal worktree while they keep its branch;
- NEOT runs only registered quality-gate commands without a shell;
- each verification attempt records its command, result, output, duration, and required status;
- failed verification can return a run for rework and a later verification attempt;
- a passed run requires a separate human action before NEOT creates a local commit;
- the commit gate rejects a worktree that changed after its last passed verification attempt;
- NEOT does not push Agent commits or change protected branches;
- the tool catalog defines capability, access, and risk metadata for future executors;
- agent profiles remain definitions, while Codex supplies the current executable runtime;
- preview, deployment, provider routing, and Codex command interception remain planned.
- named supervisors and delegates are actor-owned personas that can be assigned to a durable task graph;
- Agent Connector owns two isolated Codex credential homes and App Server processes. Primary is the
  default, while parallel delegates rotate across connected primary and secondary slots;
- Project Agent stores the Codex action timeline with each response. The timeline shows commands,
  tools, searches, file changes, delegates, and native automatic context compaction;
- Agent Connector also owns actor-scoped, encrypted model-provider connections for OpenAI,
  Anthropic Claude, OpenRouter, OpenCode, and DeepSeek. OpenAI remains the default. Native Codex is
  the current coding runtime; non-Codex providers declare the OpenCode bridge and remain unavailable
  to coding turns until their provider connection and OpenCode server both pass live checks;
- calling a ready task now executes its named delegate through Codex in the prepared child worktree;
- delegate prompts carry the assigned objective, file scope, persona instructions, dependency evidence,
  and a permission ceiling derived from the parent run and Agent profile;
- delegate completion is automatic only after the worktree remains inside its declared file scope;
- a named supervisor can execute the dependency-final review task, while a human still owns the
  parent approval gate;
- the first authenticated Orchestration request after an API restart recovers running delegates in
  their existing child runs and worktrees with new Codex turns and durable recovery events;
- NEOT can register the Hostinger VPS MCP server in its private Codex runtime. The server-side
  environment supplies the API token, while Codex applies MCP tool approval policy. NEOT never
  returns the token to the browser or stores it in the generated Codex configuration.
- The read-only Hostinger dashboard retrieves VPS capacity and six-hour health metrics together
  with Docker project, container, image-version, health, and published-port inventory through MCP.
- The local-first Sync module connects an approved local installation to NEOT Cloud through
  an outbound authenticated API. Manual publish and pull operations transfer revisioned work data,
  registry documentation, and project attachments. A pull stops when pending local records could
  be overwritten.

Orchestration owns runtime persistence through an additive migration and actor-scoped repositories.
The local executor enforces the recorded run limits through the Codex turn interrupt contract.

## Target Architecture

Project is the primary engineering context. The lifecycle is Plan, Develop, Source, Test, Review,
Preview, Deploy, and Observe. Future orchestration should add these capabilities in bounded phases:

1. workflow and run records with explicit state transitions, audit events, budgets, and approvals;
2. a provider-neutral model gateway where agents request capabilities rather than selecting vendor
   SDKs directly;
3. schema-validated tool contracts with permission checks and isolated branch or worktree execution;
4. preview, deployment, rollback, monitoring, and outcome feedback;
5. Organization, Workspace, Project, Environment, and granular membership boundaries only through
   an explicit tenancy design and migration.

Multi-user isolation is a target architecture, not a current claim. It must not be simulated with a
selector or a second application shell. Adding it requires an architecture decision that covers
identity, row ownership, authorization, migration of existing records, storage isolation, audit,
background jobs, and deployment compatibility.

## Control Rules

- Humans approve production, infrastructure, DNS, secrets, destructive data, and protected-branch
  operations.
- Every executable run must record project context, actor, agent profile, Assist mode, permission
  ceiling, tool calls, model route, cost or resource budget, results, and approvals.
- Parallel work must use bounded isolated checkouts and merge only after conflict and quality gates.
- Local and remote models are interchangeable policy choices; privacy rules constrain fallback.
- The existing guarded updater remains the deployment path. Application image rollback does not
  reverse database migrations or seeds.
