# Agent IDE Toolchain

This document records the approved tool direction for CodeLogix. It separates current capability
from planned capability. A package does not become an approved runtime because it appears here.

## Decisions

| Area | Decision | State | Owner |
| --- | --- | --- | --- |
| Desktop UI | Use Tauri, React, Monaco, and Zustand. Keep the first-load shell small. | Current | Desktop |
| Web UI | Use React, Tailwind CSS, Radix UI, and shared UI components. | Current | NEOT web |
| Validation | Use Zod at TypeScript process and protocol boundaries. Use Serde in Rust. | Current | Each module |
| Agent runtime | Keep the bundled Codex App Server as the default executable runtime. | Current | Desktop |
| Agent workflow | Evaluate LangGraph.js for provider-neutral durable workflows. | Planned | Orchestration |
| Agent helpers | Add LangChain.js only when an adapter needs its integrations. | Deferred | Orchestration |
| Tool protocol | Use MCP for external tools, resources, and prompts. | Current | Orchestration |
| Text search | Use ripgrep first. Use the bounded Rust scanner when ripgrep is absent. | Current | Desktop |
| Code intelligence | Add LSP before broad AST indexing. Start with TypeScript, Python, and Rust. | Next | Desktop runtime |
| Syntax structure | Add Tree-sitter for symbols, structural search, and impact indexing. | Next | Desktop runtime |
| Semantic search | Add local vector search only after search quality measurements show a need. | Deferred | Desktop runtime |
| Browser | Use Playwright for approved browser tests and visual verification. | Current | Test tooling |
| Isolation | Use Git worktrees now. Add guarded Docker execution profiles next. | Partial | Orchestration |
| GitHub | Use the existing GitHub API workspace and approved MCP tools. | Current | GitHub Dashboard |
| Jobs | Use MariaDB as the source of truth. Use BullMQ and Redis as delivery adapters. | Current | NEOT API |
| Realtime | Use Tauri events locally and Socket.IO for authenticated server events. | Current | Desktop and API |
| Node protocol | Use versioned WebSocket messages for future node coordination. | Planned | Node runtime |
| Observability | Add OpenTelemetry to Node services first. Do not start with browser tracing. | Next | Platform API |
| Unit tests | Use Node tests for framework code and Vitest for desktop TypeScript. | Current | Each owner |
| End-to-end tests | Use Playwright for web and native-visible workflow proof. | Current | Test tooling |
| Project learning | Detect facts, require review, recheck evidence, and use approved facts only. | Current | Desktop |

LangGraph can run without the full LangChain package. Do not add both packages by default. The
current orchestration module already owns durable runs, task graphs, approvals, and worktrees. An
architecture decision must show how LangGraph replaces or adapts this state before installation.

## Model support

OpenAI remains the default provider. The current API also accepts an OpenAI-compatible base URL.
Do not expose provider credentials to React or agent prompts.

Add model providers through one gateway contract in this order:

1. Keep the current OpenAI adapter and OpenAI-compatible HTTP adapter.
2. Add Ollama and vLLM connection checks through the compatible adapter where possible.
3. Add native Anthropic and Gemini adapters only for features that the compatible adapter cannot
   supply.
4. Record the provider, model, policy, latency, usage, and failure for every run.

Agent profiles request capabilities. They must not import provider SDKs. The gateway owns SDKs,
credentials, fallback, rate limits, and model-specific request conversion.

## Search flow

Use the smallest search tool that can answer the question:

```text
File name or text -> ripgrep
Symbol definition or reference -> LSP
Code structure or pattern -> Tree-sitter
Repository concept -> local vector index, when approved
```

Do not send the whole repository to a model. Select files with repository rules, text search,
symbols, syntax structure, and the current task.

## Execution boundary

The desktop must remain useful without Redis, Docker, cloud access, or a vector database. Redis and
BullMQ belong to the API or a managed worker. Docker jobs require explicit mounts, network policy,
resource limits, time limits, and approval rules.

Use versioned internal events between runtime owners and UI surfaces. Validate external messages
before conversion. The next event slice must cover agent status, tool calls, commands, file
changes, tests, approvals, completion, and failure without exposing provider-specific payloads.

## Project learning loop

The desktop detects project facts from manifests, instruction files, project paths, and skill
roots. It stores each fact with its evidence path in workspace-scoped SQLite data.

The user must approve a fact before the agent can use it. A rejected fact stays visible and can be
approved later. A changed fact returns to review. A missing evidence path makes the fact stale.

The agent receives approved facts in a separate project-learning block. It must recheck the
evidence before a risky change. The learning loop does not edit repository instructions, skills,
source files, or its own application code.

## Delivery order

1. Complete the typed agent event contract and event journal.
2. Add LSP lifecycle management for TypeScript, Python, and Rust.
3. Add Tree-sitter symbols and structural search.
4. Add guarded Docker execution for isolated worktrees.
5. Add OpenTelemetry traces and metrics to the API and job workers.
6. Add the provider gateway adapters and project model policy.
7. Evaluate LangGraph against the existing orchestration state machine.
8. Add vector search only after a measured retrieval test.
