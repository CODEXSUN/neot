# Engineering Rules

`rules.md` is the canonical repository rule set. In addition:

- Keep fixed `/api/neot/*` route contracts and explicit Zod request schemas.
- Protect system records and NEOT permissions in backend services or host authorization.
- Keep dependency installation and build artifacts at the repository root.
- Keep cloud synchronization token validation and snapshot allowlists inside the Sync module.
