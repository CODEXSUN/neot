#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO_DIR="${NEOT_WATCHER_REPO_DIR:-/home/neot}"
REMOTE="${NEOT_WATCHER_REMOTE:-origin}"
BRANCH="${NEOT_WATCHER_BRANCH:-main}"
DEPLOY_ENV="${NEOT_WATCHER_DEPLOY_ENV:-$REPO_DIR/.container/deploy.env}"
STATE_DIR="${NEOT_WATCHER_STATE_DIR:-/var/lib/neot-update-watcher}"
LOCK_FILE="${NEOT_WATCHER_LOCK_FILE:-/run/lock/neot-update-watcher.lock}"
CHECK_ONLY=false

usage() {
  cat <<'EOF'
Usage: neot-update-watcher.sh [--check]

Fetch and safely deploy a fast-forward update from origin/main. --check validates
the watcher, repository, Docker runtime, and current NEOT deployment without
fetching or changing source, containers, images, or configuration.
EOF
}

while (($# > 0)); do
  case "$1" in
    --check) CHECK_ONLY=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Required command is unavailable: $1"; }

for command in bash docker flock git sed; do require_command "$command"; done
[[ -d "$REPO_DIR/.git" ]] || fail "NEOT checkout was not found at $REPO_DIR"
[[ -f "$DEPLOY_ENV" ]] || fail "Deployment environment was not found at $DEPLOY_ENV"
[[ -f "$REPO_DIR/update.sh" ]] || fail "Updater was not found at $REPO_DIR/update.sh"
docker info >/dev/null 2>&1 || fail "Docker Engine is not reachable"

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Another watcher run is active"
[[ -z "$(git -C "$REPO_DIR" status --porcelain --untracked-files=normal)" ]] ||
  fail "Production checkout is dirty; preserve and review those files before automated deployment"
[[ "$(git -C "$REPO_DIR" branch --show-current)" == "$BRANCH" ]] ||
  fail "Production checkout must be on branch $BRANCH"

if [[ "$CHECK_ONLY" == true ]]; then
  bash "$REPO_DIR/update.sh" --check
  log "Watcher preflight passed for $REPO_DIR"
  exit 0
fi

git -C "$REPO_DIR" fetch --prune "$REMOTE" "$BRANCH"
current_commit="$(git -C "$REPO_DIR" rev-parse HEAD)"
target_commit="$(git -C "$REPO_DIR" rev-parse "$REMOTE/$BRANCH")"
if [[ "$current_commit" == "$target_commit" ]]; then
  log "No update available at $target_commit"
  exit 0
fi
git -C "$REPO_DIR" merge-base --is-ancestor "$current_commit" "$target_commit" ||
  fail "$REMOTE/$BRANCH is not a fast-forward update from $current_commit"

candidate_dir="$(mktemp -d /var/tmp/neot-update-candidate.XXXXXX)"
cleanup_candidate() {
  git -C "$REPO_DIR" worktree remove --force "$candidate_dir" >/dev/null 2>&1 || true
  rm -rf -- "$candidate_dir"
}
trap cleanup_candidate EXIT
git -C "$REPO_DIR" worktree add --detach "$candidate_dir" "$target_commit" >/dev/null
log "Building isolated verification target for $target_commit"
docker build --target verify -f "$candidate_dir/.container/scripts/Dockerfile.stack" "$candidate_dir"
cleanup_candidate
trap - EXIT

git -C "$REPO_DIR" merge --ff-only "$target_commit"
version="$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$REPO_DIR/package.json" | head -n 1)"
[[ -n "$version" ]] || fail "Could not read package version after fast-forward"
mkdir -p "$STATE_DIR/config-backups"
cp -p -- "$DEPLOY_ENV" "$STATE_DIR/config-backups/deploy.env.pre-${target_commit:0:12}"
for key in NEOT_VERSION NEOT_IMAGE_TAG NEOT_MIGRATION_COMPATIBLE_VERSION; do
  grep -qE "^${key}=" "$DEPLOY_ENV" || fail "$key is missing from $DEPLOY_ENV"
  sed -i -E "s|^${key}=.*$|${key}=${version}|" "$DEPLOY_ENV"
done

log "Running deployment preflight for NEOT $version"
bash "$REPO_DIR/update.sh" --check
log "Applying NEOT $version"
bash "$REPO_DIR/update.sh" --yes

project="$(sed -n 's/^NEOT_COMPOSE_PROJECT=//p' "$DEPLOY_ENV" | tail -n 1)"
image_registry="$(sed -n 's/^NEOT_IMAGE_REGISTRY=//p' "$DEPLOY_ENV" | tail -n 1)"
project="${project:-neot}"
image_registry="${image_registry:-neot}"
while IFS= read -r container_id; do
  [[ -n "$container_id" ]] && docker container rm "$container_id" >/dev/null
done < <(docker container ls -aq --filter "label=com.docker.compose.project=$project" --filter "label=com.docker.compose.oneoff=True" --filter status=exited)
while IFS= read -r image_id; do
  [[ -n "$image_id" ]] || continue
  if ! docker container ls -aq --filter "ancestor=$image_id" | grep -q .; then
    docker image rm "$image_id" >/dev/null 2>&1 || true
  fi
done < <(docker image ls --format '{{.Repository}} {{.ID}}' | awk -v prefix="$image_registry/" '$1 ~ "^" prefix {print $2}' | sort -u)

mkdir -p "$STATE_DIR"
printf '%s\n' "$target_commit" >"$STATE_DIR/last-successful-commit"
printf '%s\n' "$version" >"$STATE_DIR/last-successful-version"
log "Deployment completed for NEOT $version at $target_commit"
