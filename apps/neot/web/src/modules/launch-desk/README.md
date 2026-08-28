# Codex Connection

This workspace provides an independent Codex App Server connection using managed ChatGPT authentication. Browser OAuth is the primary option and device-code authorization is the fallback. The page shows the current connection status, its last-check timestamp, and recent status changes stored on the current device.

## Structure

- `launch-desk.workspace.tsx` composes the connection workspace.
- `codex-connection.tsx` owns device login and current status.
- `codex-connection-history.tsx` records and displays the latest 20 status changes.
- `launch-desk.services.ts` calls the NEOT orchestration API.
- `codex-app-server.client.ts` owns the local Codex JSON-RPC process.

## Local setup

1. Copy `.env.example` to `.env`.
2. Keep `CODEX_EXECUTABLE=bundled` to use the pinned Codex CLI package.
3. Optionally set `NEOT_CODEX_HOME` to choose the private authentication location.
4. Run `npm.cmd install` from the repository root.
5. Run `npm.cmd run dev`.
6. Open `/app/neot/launch-desk`.

NEOT defaults to `%LOCALAPPDATA%/NEOT/NEOT/codex`. Keep this directory outside source control. The connection page does not need `OPENAI_API_KEY` because it authenticates the local Codex runtime through the official device flow.

## Validation checklist

- [ ] Disconnected status includes the latest check timestamp.
- [ ] Device login displays a one-time code and waits for approval.
- [ ] Browser login opens the App Server authorization URL and receives its local callback.
- [ ] An abandoned browser login can be cancelled.
- [ ] Connected status displays the account, plan, and latest check timestamp.
- [ ] Connect and disconnect transitions appear once in connection history.
- [ ] NEOT uses an authentication location independent from Codex IDE.
