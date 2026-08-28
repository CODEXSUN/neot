# NEOT Assist

NEOT is standalone and single-client. Platform supplies local identity, authorization, one
MariaDB connection, and the executable API/web shell. NEOT supplies developer planning,
projects, tasks, registry, whiteboards, repository status, attachments, and optional cloud sync.

There is one MariaDB database selected by `DB_NAME`. Do not add tenant selectors, database
routers, external identity gateways, or a second application shell.

Read `AGENT-GUIDE.md`, then the relevant architecture and governance rules before changing code.
The planned local-first, hybrid, multi-node platform direction is recorded in
`architecture/future-platform-blueprint.md`; it is not a description of current runtime capability.

For version bumps, GitHub releases, and VPS updates, follow
`documentation/release-notes-standard.md`. The document defines the changelog, version, commit,
verification, and stop rules.

For every desktop agent connector, follow `documentation/agent-tool-policy.md`. It defines the
shared inspect, search, planning, writing, refactoring, verification, and review tool boundary.
