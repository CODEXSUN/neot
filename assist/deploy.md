# Docker Deployment Runtime

NEOT Docker deployment separates immutable application files from mutable Agent state. The API
image includes Git and starts through `api-entrypoint.sh`, which prepares the mounted runtime
directories and then drops privileges to the `node` user.

Compose owns three persistent Agent volumes:

- `/var/lib/neot/codex` for Codex authentication and state;
- `/srv/neot/repositories` for complete Git repositories;
- `/var/lib/neot/worktrees` for isolated Agent worktrees.

Setup and update preflight checks confirm that the API runs as UID 1000, Git is executable, and all
three directories are writable. A project must reference a complete clone below the repository
root. An empty `git init` in the application image is not a valid source repository.

Use these checks after deployment:

```sh
docker exec neot-api sh -lc 'id; git --version'
docker exec neot-api sh -lc 'test -w "$NEOT_CODEX_HOME"'
docker exec neot-api sh -lc 'test -w "$NEOT_AGENT_WORKTREE_ROOT"'
docker exec neot-api sh -lc 'test -w "$NEOT_AGENT_ALLOWED_ROOTS"'
```

Do not run the API as root, apply recursive `chmod 777`, bake secrets into the image, or mount Git
metadata without its matching checkout.

## Ubuntu production update watcher

The production checkout stays at `/home/neot`. A systemd timer checks `origin/main` every five
minutes. It accepts fast-forward commits only and builds the candidate Docker `verify` target in a
detached temporary worktree before changing the live checkout.

Install the watcher after the first manual deployment:

```sh
cd /home/neot
sudo bash .container/update-watcher/install.sh
sudo /usr/local/sbin/neot-update-watcher --check
systemctl list-timers neot-update-watcher.timer --no-pager
```

Each accepted update follows this order:

1. Lock the watcher and require a clean `/home/neot` `main` checkout.
2. Fetch and require a fast-forward `origin/main` commit.
3. Build the candidate verification image in an isolated Git worktree.
4. Fast-forward the production checkout and copy the current deployment environment as a backup.
5. Align only the three release-version fields. Preserve every secret and topology value.
6. Run `bash update.sh --check`, then the guarded `bash update.sh --yes` flow.
7. Let the updater verify Docker, create and checksum a MariaDB backup, migrate, seed, replace only
   API and Web, verify both health endpoints, and write deployment metadata.
8. Remove only stopped NEOT Compose one-off containers and unused images in the configured
   NEOT image namespace. Never prune volumes or unrelated Docker resources.
9. Record the successful commit and version below `/var/lib/neot-update-watcher`.

Inspect every automatic run through the system journal:

```sh
systemctl status neot-update-watcher.timer --no-pager
journalctl -u neot-update-watcher.service -n 200 --no-pager
cat /var/lib/neot-update-watcher/last-successful-commit
cat /var/lib/neot-update-watcher/last-successful-version
```

If Git diverges, the checkout is dirty, isolated verification fails, backup or migration fails, or
health checks fail, the run stops. Do not force-reset production or automatically reverse a
completed migration. Review the journal, retained backup, and deployment metadata before retrying.
