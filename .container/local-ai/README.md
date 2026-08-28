# NEOT local AI environment

This operator kit creates a local-only Ollama and Qdrant environment when you explicitly apply it.
It does not start services, download models, alter NEOT credentials, or change the default Codex
coding runtime unless you run an apply command.

## Design

| Responsibility | Local service | Why |
| --- | --- | --- |
| Chat and embedding inference | Ollama | Local OpenAI-compatible model API on loopback. |
| Semantic retrieval, if later approved | Qdrant | Purpose-built vector storage and similarity search. |
| NEOT projects, identity, runs, and metadata | MariaDB | Existing transactional product store. |

MariaDB vector search is not added by this kit. Qdrant is a better local vector engine for the
future retrieval use case; MariaDB remains the source of truth for NEOT records. The desktop
continues to work without either service.

## Safe operator workflow

From the repository root:

```powershell
# Displays the plan only. It does not change the computer.
npm.cmd run local-ai:setup

# Creates local data folders, copies the ignored .container/local-ai/.env file,
# and starts only loopback-bound Ollama and Qdrant containers.
npm.cmd run local-ai:setup -- -Apply

# Downloads the configured chat and embedding models only when you opt in.
npm.cmd run local-ai:setup -- -Apply -PullModels

# Shows container and endpoint state.
npm.cmd run local-ai:status

# Performs an explicit live test: one local model response plus a temporary
# Qdrant collection create/remove probe.
npm.cmd run local-ai:test
```

The default chat model is `qwen2.5-coder:3b`, a practical balance for a typical local development
machine. For a minimal smoke test, edit `.container/local-ai/.env` to use `qwen2.5-coder:0.5b`; use
`qwen2.5-coder:7b` only after checking local memory and download capacity. The default embedding model
is `nomic-embed-text`.

Use these explicit operational actions as needed:

```powershell
npm.cmd run local-ai:start
powershell -NoProfile -ExecutionPolicy Bypass -File .container/local-ai/run-local-ai.ps1 -Action pull -Model qwen2.5-coder:3b
powershell -NoProfile -ExecutionPolicy Bypass -File .container/local-ai/run-local-ai.ps1 -Action logs -Follow
powershell -NoProfile -ExecutionPolicy Bypass -File .container/local-ai/run-local-ai.ps1 -Action stop
```

## NEOT connection boundary

After the model is pulled, Desktop Settings can point its Ollama provider to
`http://127.0.0.1:11434` and select the installed model. This bootstrap does not make an Ollama
model an autonomous coding agent and does not replace the bundled Codex App Server. A provider
adapter with an approved tool and permission policy is still required before a local model may read
files, run commands, or edit a workspace.

Qdrant is deliberately provisioned but not used by NEOT yet. Add retrieval only after a measured
search-quality evaluation, following `assist/architecture/agent-ide-toolchain.md`.

## Local security and recovery

- Both container ports bind to `127.0.0.1`; they are not exposed on the LAN.
- Models and vectors persist under the ignored `storage/local-ai/` directory by default.
- `stop` keeps data. It never runs `docker compose down -v`.
- The `test` command creates and removes only the `neot_setup_probe` collection unless you pass
  `-KeepProbe`.
- Pin image tags in `.container/local-ai/.env` before using this configuration as a controlled team
  baseline.
