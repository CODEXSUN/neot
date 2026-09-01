#!/usr/bin/env bash
set -euo pipefail
umask 077

CONTAINER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$CONTAINER_DIR/.." && pwd)"
RUNTIME_ENV="${NEOT_RUNTIME_ENV:-$ROOT_DIR/.env}"
DEPLOY_ENV="${NEOT_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}"
COMPOSE_FILE="$CONTAINER_DIR/docker-compose.yml"
BACKUP_DIR="$CONTAINER_DIR/backups"
ASSUME_YES=false
CHECK_ONLY=false
ALLOW_DIRTY=false
LOCK_FILE="${TMPDIR:-/tmp}/neot-update.lock"
backup_file="not-created"
backup_temp=""
backup_checksum="not-created"
metadata_file="not-created"
migration_result="not-started"
seed_result="not-started"
source_commit="unknown"
source_dirty="unknown"
source_version="unknown"
built_api_image="not-built"
built_web_image="not-built"

cleanup_partial_files() {
  [[ -z "$backup_temp" ]] || rm -f -- "$backup_temp" || true
  [[ "$metadata_file" == "not-created" ]] || rm -f -- "${metadata_file}.partial" || true
}
trap cleanup_partial_files EXIT

usage() {
  cat <<'EOF'
Usage: bash update.sh [--check] [--yes] [--allow-dirty]

Safely update an existing NEOT Docker installation while preserving:

  - root .env runtime settings and secrets
  - .container/deploy.env Docker topology and database credentials
  - the existing MariaDB container, database, and named data volume
  - container names, network names, bind addresses, and host ports

Before application replacement, the updater verifies the build and repository
checks in Docker, creates a validated MariaDB backup, and runs migrations and
repeatable seeds with the new API image. It recreates only API and Web, verifies
Docker health plus both HTTP endpoints, and restores the previous application
images if replacement fails.

The updater never runs the interactive installer, resets or recreates MariaDB,
removes volumes, changes credentials, pulls source, or updates unrelated containers.

Options:
      --check Validate the existing deployment without rebuilding containers.
      --allow-dirty Build uncommitted source after recording a prominent warning.
  -y, --yes  Apply the update without an interactive confirmation.
  -h, --help Show this help.

Run this script after updating the repository source.
EOF
}

while (($# > 0)); do
  case "$1" in
    -y|--yes)
      ASSUME_YES=true
      ;;
    --check)
      CHECK_ONLY=true
      ;;
    --allow-dirty)
      ALLOW_DIRTY=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
  shift
done

if [[ "$CHECK_ONLY" != true ]]; then
  command -v flock >/dev/null 2>&1 || {
    echo "flock is required to serialize NEOT deployment updates." >&2
    exit 69
  }
  exec 9>"$LOCK_FILE"
  flock -n 9 || {
    echo "Another NEOT update is already running (lock: $LOCK_FILE)." >&2
    exit 75
  }
fi

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command is unavailable: $1" >&2
    exit 69
  }
}

file_value() {
  local file="$1" key="$2" default_value="${3:-}" value
  value="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
  printf '%s' "${value:-$default_value}" | tr -d '\r'
}

safe_docker_name() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || {
    echo "Unsafe Docker resource name in $DEPLOY_ENV: $1" >&2
    exit 78
  }
}

container_is_running() {
  [[ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" == true ]]
}

container_is_compose_service() {
  local container="$1" project="$2" service="$3"
  [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' \
    "$container" 2>/dev/null || true)" == "$project" ]] &&
    [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' \
      "$container" 2>/dev/null || true)" == "$service" ]]
}

compose() {
  NEOT_RUNTIME_ENV_FILE="$RUNTIME_ENV" docker compose \
    --env-file "$RUNTIME_ENV" \
    --env-file "$DEPLOY_ENV" \
    -f "$COMPOSE_FILE" "$@"
}

verify_agent_runtime_image() {
  compose run --rm --no-deps api sh -lc '
    test "$(id -u)" = "1000"
    command -v git >/dev/null
    git --version
    test -w "$NEOT_CODEX_HOME"
    test -w "$NEOT_AGENT_WORKTREE_ROOT"
    test -w "$NEOT_AGENT_ALLOWED_ROOTS"
    test -w "$NEOT_STORAGE_PATH"
    test -w "$FILE_MANAGER_LOCAL_ROOT"
  '
}

verify_agent_runtime_container() {
  docker exec "$api_container" sh -lc '
    test "$(id -u)" = "1000"
    command -v git >/dev/null
    test -w "$NEOT_CODEX_HOME"
    test -w "$NEOT_AGENT_WORKTREE_ROOT"
    test -w "$NEOT_AGENT_ALLOWED_ROOTS"
    test -w "$NEOT_STORAGE_PATH"
    test -w "$FILE_MANAGER_LOCAL_ROOT"
  '
}

require_file() {
  [[ -f "$1" ]] || {
    echo "Required configuration file is missing: $1" >&2
    echo "Run bash setup.sh once before using bash update.sh." >&2
    exit 78
  }
}

require_setting() {
  local file="$1" key="$2"
  [[ -n "$(file_value "$file" "$key")" ]] || {
    echo "$key is missing from $file." >&2
    echo "The updater will not invent or replace existing credentials." >&2
    exit 78
  }
}

positive_integer() {
  [[ "$1" =~ ^[1-9][0-9]*$ ]]
}

read_source_version() {
  sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    "$ROOT_DIR/package.json" | head -n 1
}

validate_release_contract() {
  source_version="$(read_source_version)"
  [[ -n "$source_version" ]] || {
    echo "Could not read the source version from $ROOT_DIR/package.json." >&2
    exit 78
  }

  local key configured
  for key in NEOT_VERSION NEOT_IMAGE_TAG; do
    configured="$(file_value "$DEPLOY_ENV" "$key")"
    [[ "$configured" == "$source_version" ]] || {
      echo "Release version mismatch: package.json is $source_version but $key is ${configured:-unset}." >&2
      echo "Update $DEPLOY_ENV before building; mixed source and image versions are refused." >&2
      exit 78
    }
  done

  configured="$(file_value "$DEPLOY_ENV" NEOT_MIGRATION_COMPATIBLE_VERSION)"
  [[ "$configured" == "$source_version" ]] || {
    echo "Migration compatibility is not approved for NEOT $source_version." >&2
    echo "After confirming backward compatibility with the current image, set:" >&2
    echo "  NEOT_MIGRATION_COMPATIBLE_VERSION=$source_version" >&2
    echo "in $DEPLOY_ENV." >&2
    exit 78
  }
}

inspect_source_state() {
  require_command git
  git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "NEOT update source is not a Git worktree: $ROOT_DIR" >&2
    exit 78
  }
  source_commit="$(git -C "$ROOT_DIR" rev-parse HEAD)"
  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain --untracked-files=normal)" ]]; then
    source_dirty=true
    echo "WARNING: the NEOT Git worktree contains uncommitted or untracked files." >&2
    echo "Commit: $source_commit" >&2
    if [[ "$ALLOW_DIRTY" != true ]]; then
      echo "Commit/stash the changes, or rerun with --allow-dirty to deploy and record them." >&2
      exit 78
    fi
    echo "Continuing because --allow-dirty was explicitly supplied; this build is not reproducible from the commit alone." >&2
  else
    source_dirty=false
  fi
}

available_megabytes() {
  df -Pk "$1" | awk 'NR == 2 { print int($4 / 1024) }'
}

require_free_space() {
  local path="$1" required_mb="$2" label="$3" available_mb
  available_mb="$(available_megabytes "$path")"
  positive_integer "$available_mb" || {
    echo "Could not determine free space for $label at $path." >&2
    exit 74
  }
  ((available_mb >= required_mb)) || {
    echo "Insufficient free space for $label: ${available_mb} MB available, ${required_mb} MB required at $path." >&2
    exit 74
  }
  echo "  Disk space for $label: ${available_mb} MB available (${required_mb} MB minimum)"
}

write_deployment_metadata() {
  local status="$1" api_digest="$2" web_digest="$3"
  [[ "$metadata_file" != "not-created" ]] || return 0
  cat >"${metadata_file}.partial" <<EOF
{
  "timestamp": "$timestamp",
  "status": "$status",
  "sourceCommit": "$source_commit",
  "sourceDirty": $source_dirty,
  "applicationVersion": "$source_version",
  "migrationCompatibilityVersion": "$(file_value "$DEPLOY_ENV" NEOT_MIGRATION_COMPATIBLE_VERSION)",
  "apiImageDigest": "$api_digest",
  "webImageDigest": "$web_digest",
  "previousApiImageDigest": "$old_api_image",
  "previousWebImageDigest": "$old_web_image",
  "migrationResult": "$migration_result",
  "seedResult": "$seed_result",
  "backupPath": "$backup_file",
  "backupSha256": "$backup_checksum"
}
EOF
  mv -- "${metadata_file}.partial" "$metadata_file"
  chmod 600 "$metadata_file" 2>/dev/null || true
}

prune_old_backups() {
  local retention="$1" count=0 old_backup backup_name backup_timestamp
  while IFS= read -r old_backup; do
    count=$((count + 1))
    if ((count > retention)); then
      backup_name="${old_backup##*/}"
      backup_timestamp="${backup_name#${project}-${database}-}"
      backup_timestamp="${backup_timestamp%.sql}"
      rm -f -- "$old_backup" "${old_backup}.sha256"
      rm -f -- "$resolved_backup_dir/${project}-deployment-${backup_timestamp}.json"
      echo "Removed expired backup: $old_backup"
    fi
  done < <(find "$resolved_backup_dir" -maxdepth 1 -type f \
    -name "${project}-${database}-*.sql" -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
}

require_command docker
require_command curl
require_command sha256sum
docker info >/dev/null 2>&1 || {
  echo "Docker Engine is not reachable." >&2
  exit 69
}
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 is required." >&2
  exit 69
}

require_file "$RUNTIME_ENV"
require_file "$DEPLOY_ENV"
require_file "$COMPOSE_FILE"

for key in DB_NAME DB_USER DB_PASSWORD JWT_SECRET INITIAL_ADMIN_EMAIL INITIAL_ADMIN_PASSWORD; do
  require_setting "$RUNTIME_ENV" "$key"
done
for key in \
  NEOT_VERSION \
  NEOT_IMAGE_TAG \
  NEOT_MIGRATION_COMPATIBLE_VERSION \
  NEOT_COMPOSE_PROJECT \
  NEOT_API_CONTAINER_NAME \
  NEOT_WEB_CONTAINER_NAME \
  NEOT_NETWORK; do
  require_setting "$DEPLOY_ENV" "$key"
done

project="$(file_value "$DEPLOY_ENV" NEOT_COMPOSE_PROJECT neot)"
api_container="$(file_value "$DEPLOY_ENV" NEOT_API_CONTAINER_NAME neot-api)"
web_container="$(file_value "$DEPLOY_ENV" NEOT_WEB_CONTAINER_NAME neot-web)"
network="$(file_value "$DEPLOY_ENV" NEOT_NETWORK cxapp-network)"
network_external="$(file_value "$DEPLOY_ENV" NEOT_NETWORK_EXTERNAL false)"
image_registry="$(file_value "$DEPLOY_ENV" NEOT_IMAGE_REGISTRY neot)"
image_tag="$(file_value "$DEPLOY_ENV" NEOT_IMAGE_TAG local)"
backup_retention="$(file_value "$DEPLOY_ENV" NEOT_BACKUP_RETENTION 10)"
database="$(file_value "$RUNTIME_ENV" DB_NAME)"
database_user="$(file_value "$RUNTIME_ENV" DB_USER)"
database_password="$(file_value "$RUNTIME_ENV" DB_PASSWORD)"
api_image="${image_registry}/api:${image_tag}"
web_image="${image_registry}/web:${image_tag}"
minimum_backup_mb="$(file_value "$DEPLOY_ENV" NEOT_UPDATE_MIN_BACKUP_FREE_MB 1024)"
minimum_docker_mb="$(file_value "$DEPLOY_ENV" NEOT_UPDATE_MIN_DOCKER_FREE_MB 5120)"

validate_release_contract
inspect_source_state

for resource in "$project" "$api_container" "$web_container" "$network"; do
  safe_docker_name "$resource"
done
[[ "$database" =~ ^[A-Za-z0-9_]+$ ]] || {
  echo "DB_NAME contains unsupported characters: $database" >&2
  exit 78
}
for setting in \
  "NEOT_BACKUP_RETENTION:$backup_retention" \
  "NEOT_UPDATE_MIN_BACKUP_FREE_MB:$minimum_backup_mb" \
  "NEOT_UPDATE_MIN_DOCKER_FREE_MB:$minimum_docker_mb"; do
  key="${setting%%:*}"
  value="${setting#*:}"
  positive_integer "$value" || {
    echo "$key must be a positive integer; received: $value" >&2
    exit 78
  }
done

for service_spec in "$api_container:api" "$web_container:web"; do
  container="${service_spec%%:*}"
  service="${service_spec##*:}"
  docker container inspect "$container" >/dev/null 2>&1 || {
    echo "Existing NEOT $service container was not found: $container" >&2
    echo "Run bash setup.sh to create a new installation." >&2
    exit 69
  }
  container_is_compose_service "$container" "$project" "$service" || {
    echo "Refusing to replace container not owned by Compose project $project: $container" >&2
    exit 78
  }
done

if [[ "$network_external" == true ]]; then
  mariadb_container="$(
    file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb
  )"
  safe_docker_name "$mariadb_container"
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Configured external Docker network was not found: $network" >&2
    exit 69
  }
  container_is_running "$mariadb_container" || {
    echo "Configured shared MariaDB container is not running: $mariadb_container" >&2
    exit 69
  }
  for container in \
    "$(file_value "$DEPLOY_ENV" NEOT_SHARED_REDIS_CONTAINER_NAME cxapp-redis)" \
    "$(file_value "$DEPLOY_ENV" NEOT_SHARED_MEDIA_CONTAINER_NAME cxapp-media)"; do
    safe_docker_name "$container"
    container_is_running "$container" || {
      echo "Configured shared container is not running: $container" >&2
      exit 69
    }
  done
  require_setting "$RUNTIME_ENV" REDIS_URL
  docker volume inspect "$(file_value "$DEPLOY_ENV" NEOT_MEDIA_DATA_VOLUME)" >/dev/null 2>&1 || {
    echo "Configured shared File Browser data volume was not found." >&2
    exit 69
  }
  infrastructure="shared MariaDB, Redis, and File Browser storage on external network $network"
else
  mariadb_container="$(
    file_value "$DEPLOY_ENV" NEOT_MARIADB_CONTAINER_NAME neot-mariadb
  )"
  safe_docker_name "$mariadb_container"
  docker container inspect "$mariadb_container" >/dev/null 2>&1 || {
    echo "Existing NEOT MariaDB container was not found: $mariadb_container" >&2
    exit 69
  }
  container_is_compose_service "$mariadb_container" "$project" mariadb || {
    echo "Refusing to use MariaDB container not owned by Compose project $project: $mariadb_container" >&2
    exit 78
  }
  infrastructure="dedicated MariaDB $mariadb_container"
fi

compose config --quiet

for container in "$mariadb_container" "$api_container" "$web_container"; do
  container_is_running "$container" || {
    echo "Existing NEOT container is not running: $container" >&2
    exit 69
  }
done

verify_agent_runtime_container || {
  echo "The current API container is missing Git or writable Agent runtime storage." >&2
  if [[ "$CHECK_ONLY" == true ]]; then
    exit 77
  fi
  echo "The replacement image will be verified before the container is recreated." >&2
}

if container_is_running "$api_container"; then
  docker exec "$api_container" node -e \
    "require('node:fs').accessSync(process.env.NEOT_ENV_FILE_PATH, require('node:fs').constants.R_OK | require('node:fs').constants.W_OK)" \
    >/dev/null 2>&1 || {
      echo "The API container user cannot read and write its mounted runtime environment." >&2
      echo "Fix ownership/permissions of $RUNTIME_ENV for the container user before updating." >&2
      exit 77
    }
fi

mkdir -p "$BACKUP_DIR"
resolved_backup_dir="$(cd "$BACKUP_DIR" && pwd -P)"
[[ "$resolved_backup_dir" != "/" && "$resolved_backup_dir" != "$ROOT_DIR" ]] || {
  echo "Refusing to use unsafe backup directory: $resolved_backup_dir" >&2
  exit 78
}
docker_root="$(docker info --format '{{.DockerRootDir}}')"
[[ -n "$docker_root" && -d "$docker_root" ]] || {
  echo "Docker did not report a readable storage root: ${docker_root:-unset}" >&2
  exit 69
}
require_free_space "$resolved_backup_dir" "$minimum_backup_mb" "MariaDB backup"
require_free_space "$docker_root" "$minimum_docker_mb" "Docker build storage"

echo
echo "NEOT Docker update plan"
echo "  Runtime configuration: $RUNTIME_ENV (preserved)"
echo "  Deployment configuration: $DEPLOY_ENV (preserved)"
echo "  Compose project: $project"
echo "  Infrastructure: $infrastructure (preserved)"
echo "  Preflight: production build and repository checks in Docker"
echo "  Release: source and image tags locked to $source_version"
echo "  Source commit: $source_commit (dirty: $source_dirty)"
echo "  Rebuild: $api_container and $web_container"
echo "  Agent runtime: Git plus persistent Codex, repository, and worktree storage"
echo "  Backup: SHA-256 verified SQL dump in $BACKUP_DIR (keep $backup_retention)"
echo "  Database: version-approved migrations and repeatable seeds before replacement"
echo "  Audit: deployment metadata beside the retained backup"
echo "  Database containers and volumes: untouched"
echo "  Source code: current repository checkout"

if [[ "$CHECK_ONLY" == true ]]; then
  echo
  echo "Existing NEOT Docker deployment is ready to update."
  exit 0
fi

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "Build and update the existing NEOT containers? [Y/n] " confirmation
  case "${confirmation:-Y}" in
    y|Y|yes|Yes|YES) ;;
    *)
      echo "Update cancelled before Docker changes."
      exit 0
      ;;
  esac
fi

old_api_image="$(docker inspect --format '{{.Image}}' "$api_container")"
old_web_image="$(docker inspect --format '{{.Image}}' "$web_container")"

if [[ "$network_external" != true ]] && ! container_is_running "$mariadb_container"; then
  echo "Starting the existing dedicated MariaDB container without recreating it."
  compose up -d mariadb --no-build --no-recreate --wait --wait-timeout 180
fi

echo "Building the verification, API, and Web images."
compose build verify api web
echo "Verifying Git and writable Agent runtime volumes in the new API image."
verify_agent_runtime_image
built_api_image="$(docker image inspect --format '{{.Id}}' "$api_image")"
built_web_image="$(docker image inspect --format '{{.Id}}' "$web_image")"

chmod 700 "$resolved_backup_dir" 2>/dev/null || true
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$resolved_backup_dir/${project}-${database}-${timestamp}.sql"
backup_temp="${backup_file}.partial"
metadata_file="$resolved_backup_dir/${project}-deployment-${timestamp}.json"

echo "Creating MariaDB backup: $backup_file"
if ! MSYS_NO_PATHCONV=1 docker exec \
  -e MYSQL_PWD="$database_password" \
  "$mariadb_container" \
  mariadb-dump \
  --no-defaults \
  --user="$database_user" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  "$database" >"$backup_temp"; then
  rm -f -- "$backup_temp"
  echo "MariaDB backup failed; the running application was not replaced." >&2
  exit 74
fi

if [[ ! -s "$backup_temp" ]] ||
  ! grep -Eq '^(-- (MariaDB|MySQL) dump|CREATE TABLE|-- Dump completed)' "$backup_temp"; then
  rm -f -- "$backup_temp"
  echo "MariaDB backup validation failed; the running application was not replaced." >&2
  exit 74
fi
mv -- "$backup_temp" "$backup_file"
backup_temp=""
chmod 600 "$backup_file" 2>/dev/null || true
backup_checksum="$(sha256sum "$backup_file" | awk '{print $1}')"
printf '%s  %s\n' "$backup_checksum" "$(basename "$backup_file")" >"${backup_file}.sha256"
chmod 600 "${backup_file}.sha256" 2>/dev/null || true
(cd "$resolved_backup_dir" && sha256sum --check "$(basename "${backup_file}.sha256")") >/dev/null || {
  echo "MariaDB backup SHA-256 verification failed; the running application was not replaced." >&2
  exit 74
}
write_deployment_metadata "backup-verified" "$built_api_image" "$built_web_image"
prune_old_backups "$backup_retention"

echo "Verifying runtime environment access with the new API image."
compose run --rm --no-deps api node -e \
  "require('node:fs').accessSync(process.env.NEOT_ENV_FILE_PATH, require('node:fs').constants.R_OK | require('node:fs').constants.W_OK)"

echo "Running database migrations with the new API image."
if ! compose run --rm --no-deps api npm run db:migrate; then
  migration_result="failed"
  write_deployment_metadata "migration-failed" "$built_api_image" "$built_web_image"
  echo "Migration failed; existing application containers remain in place." >&2
  echo "Validated backup: $backup_file" >&2
  exit 70
fi
migration_result="completed"
write_deployment_metadata "migrated" "$built_api_image" "$built_web_image"

echo "Running repeatable database seeds with the new API image."
if ! compose run --rm --no-deps api npm run db:seed; then
  seed_result="failed"
  write_deployment_metadata "seed-failed" "$built_api_image" "$built_web_image"
  echo "Database seed failed; existing application containers remain in place." >&2
  echo "Validated backup: $backup_file" >&2
  exit 70
fi
seed_result="completed"
write_deployment_metadata "seeded" "$built_api_image" "$built_web_image"

rollback_application() {
  local reason="$1" rollback_status=0
  echo "$reason" >&2
  echo "Restoring the previous API and Web images." >&2
  set +e
  docker image tag "$old_api_image" "$api_image" || rollback_status=$?
  docker image tag "$old_web_image" "$web_image" || rollback_status=$?
  compose up -d api web \
    --no-build \
    --no-deps \
    --force-recreate \
    --wait \
    --wait-timeout 300 || rollback_status=$?
  set -e
  if ((rollback_status == 0)); then
    write_deployment_metadata "rolled-back" "$built_api_image" "$built_web_image"
    echo "Previous application containers restored. Database backup: $backup_file" >&2
  else
    write_deployment_metadata "rollback-failed" "$built_api_image" "$built_web_image"
    echo "Automatic application rollback failed. Database backup: $backup_file" >&2
  fi
  exit 70
}

if ! compose up -d api web \
  --no-build \
  --no-deps \
  --force-recreate \
  --wait \
  --wait-timeout 300; then
  rollback_application "The replacement containers did not become healthy."
fi

if ! verify_agent_runtime_container; then
  rollback_application "The replacement API failed its Git and Agent storage preflight."
fi

bind_address="$(file_value "$DEPLOY_ENV" NEOT_BIND_ADDRESS 127.0.0.1)"
probe_address="$bind_address"
case "$probe_address" in
  0.0.0.0|::|"[::]") probe_address=127.0.0.1 ;;
esac
api_url="http://${probe_address}:$(file_value "$DEPLOY_ENV" NEOT_API_HOST_PORT 9250)/health"
web_url="http://${probe_address}:$(file_value "$DEPLOY_ENV" NEOT_WEB_HOST_PORT 9260)/health"

if ! curl --fail --silent --show-error --max-time 15 \
  --retry 5 --retry-delay 2 --retry-connrefused "$api_url" >/dev/null; then
  rollback_application "API HTTP verification failed: $api_url"
fi
if ! curl --fail --silent --show-error --max-time 15 \
  --retry 5 --retry-delay 2 --retry-connrefused "$web_url" >/dev/null; then
  rollback_application "Web HTTP verification failed: $web_url"
fi

new_api_image="$(docker inspect --format '{{.Image}}' "$api_container")"
new_web_image="$(docker inspect --format '{{.Image}}' "$web_container")"
write_deployment_metadata "completed" "$new_api_image" "$new_web_image"

echo
echo "NEOT Docker update completed."
echo "Web: http://$(file_value "$DEPLOY_ENV" NEOT_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" NEOT_WEB_HOST_PORT 9260)/"
echo "API health: http://$(file_value "$DEPLOY_ENV" NEOT_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" NEOT_API_HOST_PORT 9250)/health"
echo "Validated database backup: $backup_file"
echo "Backup SHA-256: $backup_checksum"
echo "Deployment metadata: $metadata_file"
echo "Existing credentials and MariaDB data were preserved."
