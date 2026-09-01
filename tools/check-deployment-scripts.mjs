import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const updater = read(".container/update.sh");
const setup = read(".container/setup.sh");
const compose = read(".container/docker-compose.yml");
const deployExample = read(".container/deploy.env.example");
const rootUpdater = read("update.sh");
const compatibilityUpdater = read("updat.sh");
const watcher = read(".container/update-watcher/neot-update-watcher.sh");
const watcherInstaller = read(".container/update-watcher/install.sh");
const watcherService = read(".container/update-watcher/neot-update-watcher.service");
const watcherTimer = read(".container/update-watcher/neot-update-watcher.timer");

requireTokens(".container/update.sh", updater, [
  "umask 077",
  "flock -n 9",
  "--allow-dirty",
  "NEOT_MIGRATION_COMPATIBLE_VERSION",
  "sha256sum --check",
  "write_deployment_metadata",
  "require_free_space",
  "rollback_application"
]);
requireTokens(".container/setup.sh", setup, [
  "NEOT_COMPOSE_PROJECT",
  "NEOT_MIGRATION_COMPATIBLE_VERSION",
  "Standalone NEOT deployment plan"
]);
requireTokens(".container/docker-compose.yml", compose, [
  "name: ${NEOT_COMPOSE_PROJECT:-neot}",
  "NEOT_ENV_FILE_PATH: /workspace/neot/.env",
  "FILE_MANAGER_LOCAL_ROOT: /var/lib/neot/media/neot/file-manager",
  "media-data:/var/lib/neot/media",
  "networks: [neot]"
]);
requireTokens(".container/deploy.env.example", deployExample, [
  "NEOT_VERSION=",
  "NEOT_MIGRATION_COMPATIBLE_VERSION=",
  "NEOT_UPDATE_MIN_BACKUP_FREE_MB=",
  "NEOT_UPDATE_MIN_DOCKER_FREE_MB=",
  "NEOT_MEDIA_DATA_VOLUME=",
  "NEOT_MEDIA_DATA_VOLUME_EXTERNAL="
]);
requireTokens("update.sh", rootUpdater, ['exec bash "$ROOT_DIR/.container/update.sh" "$@"']);
requireTokens("updat.sh", compatibilityUpdater, ['exec bash "$ROOT_DIR/update.sh" "$@"']);
requireTokens(".container/update-watcher/neot-update-watcher.sh", watcher, [
  "flock -n 9",
  "merge-base --is-ancestor",
  "worktree add --detach",
  "docker build --target verify",
  "merge --ff-only",
  "bash \"$REPO_DIR/update.sh\" --check",
  "bash \"$REPO_DIR/update.sh\" --yes",
  '"$STATE_DIR/config-backups/deploy.env.pre-${target_commit:0:12}"',
  "com.docker.compose.oneoff=True",
  "last-successful-commit"
]);
requireTokens(".container/update-watcher/install.sh", watcherInstaller, [
  "/usr/local/sbin/neot-update-watcher",
  "systemctl enable --now neot-update-watcher.timer"
]);
requireTokens(".container/update-watcher/neot-update-watcher.service", watcherService, [
  "Type=oneshot",
  "Requires=docker.service",
  "/root/.docker",
  "TimeoutStartSec=1h"
]);
requireTokens(".container/update-watcher/neot-update-watcher.timer", watcherTimer, [
  "OnUnitActiveSec=5min",
  "Persistent=true"
]);

console.info("NEOT deployment scripts verified.");

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function requireTokens(file, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
  }
}
