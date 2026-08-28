---
name: codexsun-module-owner
description: Enforce CODEXSUN's strict module-owned architecture and verification workflow. Use when implementing, refactoring, reviewing, debugging, or finalizing CODEXSUN backend/frontend modules, CRUD masters, migrations, seeds, routes, relationships, forms, lists, workspaces, lifecycle actions, application composition, npm workspace structure, or Assist rules. Trigger whenever a request says same pattern, module owned, no shared or centralized code, boundary audit, finalize a module, or move business behavior into its owner.
---

# CODEXSUN Module Owner

## Load project rules

1. Read `assist/AGENT-GUIDE.md` completely.
2. Read `assist/governance/engineering-rules.md` completely.
3. Read the owning backend and frontend module files and their public composition points.
4. Open specialized Assist documents only when routed by `assist/AGENT-GUIDE.md`.

Treat the repository's current authoritative instructions and the user's request as higher priority than stale planning or historical notes.

## Interpret requests

- For review, diagnosis, or check requests, inspect and report evidence without unrelated mutations.
- For implementation, refactor, fix, or finalize requests, change the owning module, remove obsolete implementations and exports, and validate the affected flow.
- Interpret “same pattern” as consistent role behavior and interaction tone with independently owned code. Never create a generic shared business engine.
- Consume relationships through fixed public lookup contracts. Never borrow private sibling implementation.

## Audit before editing

Inventory:

- Backend and frontend leaf files.
- Owned tables, routes, fields, payloads, seeds, parents, children, and relation responses.
- Composition registration, migration order, seed order, exports, menus, and routes.
- Shared imports and whether each is legitimate infrastructure or misplaced business logic.

Search for:

- Generic entity kinds and metadata definitions.
- Dynamic entity paths or table-name arguments.
- Centralized CRUD implementations.
- Wrapper, alias, dummy, borrowed, simplified, or reserved role files.
- Passthrough schemas and sibling fields in module payloads.
- Identical form, list, and workspace files.
- Private sibling imports, stale exports, and files outside their owner.

## Implement inside the owner

Reduced synchronous backend CRUD modules own:

```text
{module}.migration.ts
{module}.module.ts
{module}.repository.ts
{module}.routes.ts
{module}.seed.ts
{module}.service.ts
{module}.types.ts
index.ts
```

Frontend CRUD modules own:

```text
{module}.workspace.tsx
{module}.list.tsx
{module}.form.tsx
{module}.services.ts
{module}.hooks.ts
{module}.schema.ts
{module}.types.ts
index.ts
```

Keep behavior concrete:

- Use fixed URLs and typed Zod contracts through `registerContractRoute()`.
- Use exact module types and strict frontend schemas.
- Keep concrete SQL, migrations, seeds, lifecycle rules, parent validation, protected records, and dependency blockers in the leaf.
- Keep form, list, and workspace responsibilities distinct.
- Allow shared code only for transport/session context, environment access, observability, framework contracts, and reusable UI primitives without business fields or workflows.

## Preserve relationships and interactions

- A child owns its minimal parent lookup type and fixed lookup request.
- Never import a parent's private repository, service, form, hooks, types, or seed arrays.
- Submit real parent IDs and validate them on the backend.
- Keep foreign keys, migration order, seed order, relation responses, and delete blockers aligned.
- Provide list/search, create, view, edit, suspend, restore, force delete, validation, confirmation, status, loading, empty, success, and error states unless a documented domain rule provides an exemption.
- Enforce protected records in frontend and backend with clear responses.
- Stop action clicks from bubbling into clickable table-row View handlers.

## Validate before completion

Run as applicable:

1. Prettier on changed files.
2. Focused ESLint.
3. Backend TypeScript.
4. Frontend TypeScript.
5. `node tools/check-module-boundaries.mjs`.
6. Relevant production builds using the configured root environment.
7. `npm run dependencies:check`.
8. Database/E2E or browser verification when configured and required.

Repeat the ownership scan after editing. Compare role-file hashes when copied files are suspected. Confirm no nested `node_modules`, `dist`, or `dist-types` were created.

Never claim a check passed unless it ran successfully. Report unavailable database/E2E checks and existing-database migration requirements explicitly.

## Report

Lead with the outcome, then report:

- Module ownership decisions.
- Relationship contracts.
- Database compatibility requirements.
- Checks that passed.
- Checks skipped or blocked.
- Remaining concrete blockers.

Do not create task-specific Assist handoff, gap, or duplicate changelog files.
