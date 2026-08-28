---
name: neot-agent-tools
description: Apply NEOT's shared desktop agent tool policy for inspection, planning, edits, refactors, checks, and reviews.
---

# NEOT Agent Tools

Read `assist/documentation/agent-tool-policy.md` before a desktop agent requests a workspace action.

1. Use inspect, search, plan, and review as read-only tools.
2. Record observed paths, commands, patches, and verification output. Never infer successful action from a model reply.
3. Treat write, refactor, and mutating verification commands as approval-gated actions.
4. For writable work, use the selected project's managed isolated worktree and preserve unrelated changes.
5. Reject unrestricted shell, credentials, remote pushes, release publication, and deployment requests unless the named approval gate is satisfied.
6. For a release-log task, collect version, changelog, changed-path, and migration evidence before proposing a title, version action, and complete changelog entry.
7. Do not write a changelog or bump a version until the user approves the proposed release scope.
