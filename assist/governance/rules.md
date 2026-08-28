# Repository Rules

- Keep TypeScript strict and imports package-public.
- Platform owns identity, server startup, database connection, and composition only.
- Use NEOT for user-facing product branding and `neot` for technical contracts.
- Each NEOT module owns its routes, services, repositories, migration, seed, types, and web
  workspace.
- Do not move NEOT business behavior into Platform or shared helpers.
- Use `.env` as runtime configuration authority and keep secrets out of tracked files.
- Keep migrations additive and repeatable; never delete persisted records to satisfy a change.
- Preserve unrelated dirty worktree changes.
- Verification reports must name commands run and live checks skipped.
- Describe planned orchestration capabilities honestly; do not present definitions as executable
  agents or a single-client deployment as multi-user isolation.
