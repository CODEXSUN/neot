# Project Agent Prototype Roadmap

## Prototype Goal

The Project Agent turns a project conversation into a durable and reviewable Agent run.
The prototype keeps project context, actor isolation, approval history, and execution evidence.

## Implemented Foundation

- Each Codex turn creates one durable Agent run.
- The run records its actor, project, chat, model, profile, access mode, and budget.
- The run state machine controls planning, running, approval, completion, failure, and cancellation.
- Steps and events preserve runtime progress.
- Approval requests and decisions remain available for review.
- Changed files become run artifacts.
- Observed Codex activity becomes tool-call evidence.
- The Run Control lane shows the persisted state beside project chat.
- Actor filters protect chat and Agent run history.
- Writable runs use one isolated Git worktree and branch.
- Plan and read-only runs use the source checkout without write access.
- Repository roots require an explicit local allowlist.
- Runtime, tool-call, changed-file, and sub-agent limits stop the Codex turn.
- The Run Control lane shows the branch, path, revision, and worktree state.
- Cleanup rejects active or dirty worktrees and preserves the review branch.

## Scale Boundaries

The modular monolith remains the control plane until an executor needs an independent runtime.
The tool catalog stays provider-neutral and records access and risk requirements.

The Codex runtime enforces the workspace sandbox and approval mode. NEOT observes tool events
and stops the turn when a run limit is reached. The policy catalog does not yet intercept each tool
before each Codex action. NEOT now owns a separate registered verification and integration gate.

## Next Delivery Phases

### Phase 1 - Local Worktree Executor - Implemented

1. Create one isolated Git worktree for each coding run.
2. Restrict the executor to the selected repository path.
3. Stop runs that exceed time, tool, file, or sub-agent limits.
4. Record the workspace path, branch, revision, status, and changed files.
5. Preserve the worktree until review finishes.

The registered-command gate moves to Phase 2 because Codex owns command execution in the current
runtime. NEOT records command activity but does not approve commands from a project allowlist.

### Phase 2 - Verification and Integration - Implemented

1. Store verification commands and results as run artifacts.
2. Add type, lint, test, build, security, and review gates.
3. Add retry and return-for-rework transitions.
4. Create commits only after the configured quality gates pass.
5. Require human approval before protected branch or remote changes.

NEOT runs verification commands without a shell and stores each attempt. Failed checks can enter
rework and run again. A passed run exposes a separate local commit approval. NEOT never pushes
the commit. Protected branches and remote changes remain outside this phase.
NEOT fingerprints the verified worktree and rejects stale commit approval after any file change.

### Phase 3 - Task Decomposition - Implemented Foundation

1. Convert an approved plan into small durable tasks.
2. Record task dependencies as a directed graph.
3. Give each task a file scope, skill set, access ceiling, and budget.
4. Run parallel tasks only when their file scopes do not overlap.
5. Return every task result to the parent run for review.

The current slice persists named supervisor and delegate personas, assigns them to parent runs and
tasks, calls ready delegates through Codex, and keeps each writable task in an isolated worktree.
The scheduler rejects concurrent scope overlap, enforces the Agent profile permission ceiling,
records approvals and evidence on child runs, and stops a task when its changed files leave the
declared scope. A dependency-final review task may call the named supervisor before human parent
approval. Running delegates recover in their existing child worktrees after an API restart. The
recovery starts on the first authenticated Orchestration request and records parent and child
events. Per-task skill selection and controlled branch integration remain later work.

### Phase 4 - Model Gateway

1. Move provider clients behind one capability-based gateway.
2. Add explicit local, cloud, and hybrid project policies.
3. Record the provider, model, latency, tokens, and cost for each call.
4. Apply privacy rules before remote fallback.

### Phase 5 - Nodes and Containers

1. Extract the executor only after the local contract is stable.
2. Add node identity, registration, heartbeat, and capability reports.
3. Use containers for untrusted or remote execution.
4. Keep execution APIs private and use outbound authenticated connections.
5. Add retries, cancellation, cleanup, and protocol version checks.

### Phase 6 - GitHub, Preview, and Delivery

1. Connect runs to branches, issues, commits, and pull requests.
2. Add preview builds and approved temporary exposure.
3. Store deployment, health, and rollback evidence.
4. Require human approval for production operations.

## Prototype Completion Rules

The prototype is ready for the next phase when these checks pass:

- The database migration works on an existing database.
- A live Codex turn creates and completes a durable Agent run.
- The run preserves events, steps, files, and approval history.
- Another actor cannot read the run.
- The Run Control lane shows the same persisted evidence.
- API and web type checks, lint checks, builds, and boundary checks pass.
- A writable-worktree test proves isolation, dirty cleanup refusal, and branch retention.
