# NEOT production update runbook

Use `/home/neot` as the only production checkout. The systemd timer invokes
`/usr/local/sbin/neot-update-watcher`, installed from `.container/update-watcher/`.

## Manual release

1. Confirm local checks and `npm run github:now -- --dry-run --no-bump` pass.
2. Commit and push the reviewed release.
3. On the VPS, confirm `/home/neot` is clean and on `main`.
4. Run `git fetch origin main` and inspect the fast-forward target.
5. Run the watcher service once and follow its journal.
6. Verify Compose status, API and Web health, migration state, version, timer,
   retained database backup, and deployment metadata.

## Failure boundaries

- Never force-reset a dirty production checkout.
- Never prune volumes or unrelated Docker resources.
- Never invent or replace production secrets.
- Do not reverse a completed database migration automatically. The updater can
  restore prior application images only when the release declares migration
  compatibility with that prior image.
- Stop automatic retries when Git is not fast-forward, isolated verification
  fails, backup fails, migration fails, or health checks fail. Inspect the
  journal and deployment metadata before retrying.

## Evidence commands

```sh
systemctl status neot-update-watcher.timer --no-pager
journalctl -u neot-update-watcher.service -n 200 --no-pager
cd /home/neot && git status --short --branch
cd /home/neot && docker compose --env-file .env --env-file .container/deploy.env -f .container/docker-compose.yml ps
curl --fail http://127.0.0.1:9250/health
curl --fail http://127.0.0.1:9260/health
docker exec neot-api npm run db:migrations:list
```
