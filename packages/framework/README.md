# CODEXSUN Framework

The internal runtime used to compose NEOT into one API and one web platform.

## Package exports

`@neot/framework` provides stable framework and application contracts, with public subpath exports for API composition, configuration, database, environment, errors, events, health, HTTP, logging, modules, queues, and storage.

Business behavior remains in owning application modules and is not placed here.

## Development

```sh
cd ../..
npm install
npm run check
npm run build
```

Dependencies are installed only in the repository-root `node_modules`. Framework runtime files are
built into the repository-root `dist/packages/framework`; this internal workspace is not published
or installed independently.

Node.js 26 and npm 12 are the supported development baseline.

Read `assist/AGENT-GUIDE.md` before changing Framework. The local Assist pack defines the
infrastructure-only ownership boundary and repository release workflow.
