#!/usr/bin/env bash
set -euo pipefail

CONTAINER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$CONTAINER_DIR/.." && pwd)"
RUNTIME_ENV="${NEOT_RUNTIME_ENV:-$ROOT_DIR/.env}"
RUNTIME_ENV_EXAMPLE="$ROOT_DIR/.env.example"
DEPLOY_ENV="${NEOT_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}"
DEPLOY_ENV_EXAMPLE="$CONTAINER_DIR/deploy.env.example"
COMPOSE_FILE="$CONTAINER_DIR/docker-compose.yml"

usage() {
  cat <<'EOF'
Usage: bash setup.sh

Interactive standalone NEOT container installation.

The installer reviews Docker resources, host ports, database identity, and
administrator credentials. Application URLs and secrets are read from the root .env.
Press Enter at any prompt to keep the displayed value.

Configuration:
  .env                    NEOT runtime and application settings
  .container/deploy.env  Docker topology and MariaDB infrastructure secret

Included:
  - Repository-owned Framework public platform contracts
  - Repository-owned UI
  - NEOT Platform API and Web
  - Reused existing Docker network, MariaDB, Redis, and File Browser storage

Excluded:
  - CXApp, Billing, Mail, TMApp, and all other application stacks

The setup builds only this self-contained NEOT repository. It asks whether
to reuse an existing Docker network with MariaDB, Redis, and File Browser storage,
or create dedicated NEOT infrastructure. Shared services keep their existing owners.
NEOT uses its own database and storage directory.
If dedicated NEOT MariaDB data already exists, setup separately asks
whether to reuse or freshly recreate only the NEOT database volume.
EOF
}

case "${1:-}" in
  "") ;;
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

set_file_value() {
  local file="$1" key="$2" value="$3" temporary
  temporary="${file}.tmp"
  KEY="$key" VALUE="$value" awk '
    BEGIN { found = 0 }
    index($0, ENVIRON["KEY"] "=") == 1 {
      print ENVIRON["KEY"] "=" ENVIRON["VALUE"]
      found = 1
      next
    }
    { print }
    END { if (!found) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$file" > "$temporary"
  mv "$temporary" "$file"
}

set_default_if_empty() {
  local file="$1" key="$2" value="$3"
  [[ -n "$(file_value "$file" "$key")" ]] || set_file_value "$file" "$key" "$value"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

ensure_secret() {
  local file="$1" key="$2" value
  value="$(file_value "$file" "$key")"
  case "$value" in
    ""|generate-with-setup|change_this*)
      set_file_value "$file" "$key" "$(generate_secret)"
      ;;
  esac
}

prompt_setting() {
  local file="$1" key="$2" label="$3" default_value="$4" current value
  current="$(file_value "$file" "$key" "$default_value")"
  read -r -p "$label [$current]: " value
  set_file_value "$file" "$key" "${value:-$current}"
}

prompt_secret_if_empty() {
  local file="$1" key="$2" label="$3" value confirmation
  [[ -n "$(file_value "$file" "$key")" ]] && return
  while true; do
    read -r -s -p "$label: " value
    echo
    [[ -n "$value" ]] || {
      echo "$label cannot be empty." >&2
      continue
    }
    read -r -s -p "Confirm $label: " confirmation
    echo
    if [[ "$value" == "$confirmation" ]]; then
      set_file_value "$file" "$key" "$value"
      return
    fi
    echo "Values do not match. Try again." >&2
  done
}

prompt_secret() {
  local file="$1" key="$2" label="$3" current answer
  current="$(file_value "$file" "$key")"
  if [[ -n "$current" && "$current" != generate-with-setup && "$current" != change_this* ]]; then
    read -r -p "$label is configured. Keep it? [Y/n] " answer
    case "${answer:-Y}" in
      n|N|no|No|NO)
        set_file_value "$file" "$key" ""
        ;;
      *)
        return
        ;;
    esac
  fi
  prompt_secret_if_empty "$file" "$key" "$label"
}

prepare_deploy_environment() {
  if [[ ! -f "$DEPLOY_ENV" ]]; then
    cp "$DEPLOY_ENV_EXAMPLE" "$DEPLOY_ENV"
    echo "Created protected deployment settings: $DEPLOY_ENV"
  fi

  local version node_version npm_version
  case "$(file_value "$DEPLOY_ENV" DB_USER)" in
    ""|root)
      set_file_value "$DEPLOY_ENV" DB_USER neot
      echo "Configured the dedicated deployment database user: neot"
      ;;
  esac
  set_default_if_empty "$DEPLOY_ENV" DB_NAME neot_db
  ensure_secret "$DEPLOY_ENV" MARIADB_ROOT_PASSWORD
  ensure_secret "$DEPLOY_ENV" DB_PASSWORD
  version="$(grep -m1 '"version"' "$ROOT_DIR/package.json" | cut -d'"' -f4)"
  node_version="$(grep -m1 '"node"' "$ROOT_DIR/package.json" | cut -d'"' -f4 | sed 's/^[^0-9]*//')"
  npm_version="$(grep -m1 '"packageManager"' "$ROOT_DIR/package.json" | cut -d'"' -f4 | sed 's/^npm@//')"
  set_file_value "$DEPLOY_ENV" NEOT_VERSION "$version"
  set_file_value "$DEPLOY_ENV" NEOT_IMAGE_TAG "$version"
  set_file_value "$DEPLOY_ENV" NEOT_MIGRATION_COMPATIBLE_VERSION "$version"
  set_file_value "$DEPLOY_ENV" NODE_RUNTIME_VERSION "$node_version"
  set_file_value "$DEPLOY_ENV" NPM_RUNTIME_VERSION "$npm_version"
  set_default_if_empty "$DEPLOY_ENV" NEOT_CODEX_STATE_VOLUME neot-codex-state
  set_default_if_empty "$DEPLOY_ENV" NEOT_AGENT_WORKTREE_VOLUME neot-agent-worktrees
  set_default_if_empty "$DEPLOY_ENV" NEOT_AGENT_REPOSITORY_VOLUME neot-agent-repositories
  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
}

configure_deploy_environment() {
  echo
  echo "Docker deployment settings"
  prompt_setting "$DEPLOY_ENV" NEOT_COMPOSE_PROJECT "Compose project" neot
  prompt_setting "$DEPLOY_ENV" NEOT_IMAGE_REGISTRY "Image registry/prefix" neot
  prompt_setting "$DEPLOY_ENV" NEOT_API_CONTAINER_NAME "API container name" neot-api
  prompt_setting "$DEPLOY_ENV" NEOT_WEB_CONTAINER_NAME "Web container name" neot-web
  prompt_setting "$DEPLOY_ENV" NEOT_BIND_ADDRESS "Host bind address" 127.0.0.1
  prompt_setting "$DEPLOY_ENV" NEOT_API_HOST_PORT "API host port" 9250
  prompt_setting "$DEPLOY_ENV" NEOT_WEB_HOST_PORT "Web host port" 9260
  prompt_setting "$DEPLOY_ENV" DB_NAME "Application database name" neot_db
  prompt_setting "$DEPLOY_ENV" DB_USER "Application database user" neot
  prompt_secret "$DEPLOY_ENV" DB_PASSWORD "Application database password"
}

prepare_runtime_environment() {
  local infrastructure_mode="$1" database_host
  ensure_secret "$RUNTIME_ENV" JWT_SECRET

  set_file_value "$RUNTIME_ENV" NODE_ENV production
  set_file_value "$RUNTIME_ENV" AUTH_MODE jwt
  set_file_value "$RUNTIME_ENV" DEV_AUTO_LOGIN 0
  set_file_value "$RUNTIME_ENV" VITE_DEV_AUTO_LOGIN 0
  set_file_value "$RUNTIME_ENV" DB_DRIVER mariadb
  if [[ "$infrastructure_mode" == shared ]]; then
    database_host="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
  else
    database_host=mariadb
  fi
  set_file_value "$RUNTIME_ENV" DB_HOST "$database_host"
  set_file_value "$RUNTIME_ENV" DB_PORT 3306
  set_file_value "$RUNTIME_ENV" DB_USER "$(file_value "$DEPLOY_ENV" DB_USER)"
  set_file_value "$RUNTIME_ENV" DB_PASSWORD "$(file_value "$DEPLOY_ENV" DB_PASSWORD)"
  set_file_value "$RUNTIME_ENV" DB_NAME "$(file_value "$DEPLOY_ENV" DB_NAME)"
  set_file_value "$RUNTIME_ENV" PLATFORM_API_PORT \
    "$(file_value "$DEPLOY_ENV" NEOT_API_INTERNAL_PORT 9250)"
  set_file_value "$RUNTIME_ENV" PLATFORM_WEB_PORT \
    "$(file_value "$DEPLOY_ENV" NEOT_WEB_HOST_PORT 9260)"
  set_file_value "$RUNTIME_ENV" NEOT_DB_FRESH_ON_START 0
  set_file_value "$RUNTIME_ENV" NEOT_DB_RESET_CONFIRM ""
  set_file_value "$RUNTIME_ENV" NEOT_ALLOW_PRODUCTION_DB_RESET 0
  set_file_value "$RUNTIME_ENV" NEOT_STORAGE_PATH /var/lib/neot/media/neot
  set_file_value "$RUNTIME_ENV" FILE_MANAGER_LOCAL_ROOT /var/lib/neot/media/neot/file-manager
  chmod 600 "$RUNTIME_ENV" 2>/dev/null || true
}

ensure_runtime_environment_file() {
  if [[ ! -f "$RUNTIME_ENV" ]]; then
    cp "$RUNTIME_ENV_EXAMPLE" "$RUNTIME_ENV"
    chmod 600 "$RUNTIME_ENV" 2>/dev/null || true
    echo "Created runtime environment from .env.example: $RUNTIME_ENV"
  fi
}

configure_runtime_environment() {
  echo
  echo "Administrator settings"
  prompt_setting "$RUNTIME_ENV" INITIAL_ADMIN_NAME "Initial administrator name" Administrator
  prompt_setting "$RUNTIME_ENV" INITIAL_ADMIN_EMAIL \
    "Initial administrator email" admin@neot.in
  prompt_secret "$RUNTIME_ENV" INITIAL_ADMIN_PASSWORD "Initial administrator password"
}

validate_runtime_environment() {
  local key value
  for key in \
    DB_USER \
    DB_PASSWORD \
    DB_NAME \
    JWT_SECRET \
    INITIAL_ADMIN_EMAIL \
    INITIAL_ADMIN_PASSWORD \
    PLATFORM_API_URL \
    PLATFORM_WEB_ORIGIN \
    PLATFORM_WEB_HEALTH_URL; do
    [[ -n "$(file_value "$RUNTIME_ENV" "$key")" ]] || {
      echo "$key must be configured in $RUNTIME_ENV." >&2
      exit 78
    }
  done
  value="$(file_value "$RUNTIME_ENV" DB_USER)"
  [[ "$value" != root ]] || {
    echo "DB_USER must be a dedicated non-root account." >&2
    exit 78
  }
  [[ "$value" =~ ^[A-Za-z0-9_]+$ ]] || {
    echo "DB_USER may contain only letters, numbers, and underscores." >&2
    exit 78
  }
  value="$(file_value "$RUNTIME_ENV" DB_NAME)"
  [[ "$value" =~ ^[A-Za-z0-9_]+$ ]] || {
    echo "DB_NAME may contain only letters, numbers, and underscores." >&2
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

select_infrastructure_mode() {
  local answer
  while true; do
    read -r -p \
      "Reuse CXApp network and MariaDB, or create dedicated NEOT infrastructure? [reuse/dedicated] " \
      answer
    case "${answer:-reuse}" in
      reuse|Reuse|REUSE)
        printf 'shared'
        return
        ;;
      dedicated|Dedicated|DEDICATED|fresh|Fresh|FRESH)
        printf 'dedicated'
        return
        ;;
      *)
        echo "Enter reuse or dedicated." >&2
        ;;
    esac
  done
}

prepare_shared_infrastructure() {
  local mariadb media media_volume network redis redis_url root_password shared_env shared_user shared_password
  mariadb="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
  network="$(file_value "$DEPLOY_ENV" NEOT_NETWORK cxapp-network)"
  shared_env="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_ENV_FILE)"
  if [[ -n "$shared_env" && "$shared_env" != /* ]]; then
    shared_env="$CONTAINER_DIR/$shared_env"
  fi
  if [[ -n "$shared_env" ]]; then
    [[ -f "$shared_env" ]] || {
      echo "CXApp deployment environment was not found: $shared_env" >&2
      exit 69
    }
    shared_user="$(file_value "$shared_env" DB_USER)"
    shared_password="$(file_value "$shared_env" DB_PASSWORD)"
    root_password="$(file_value "$shared_env" MARIADB_ROOT_PASSWORD)"
    redis="$(file_value "$shared_env" REDIS_CONTAINER_NAME cxapp-redis)"
    redis_url="$(file_value "$shared_env" CXAPP_REDIS_URL)"
    media="$(file_value "$shared_env" MEDIA_CONTAINER_NAME cxapp-media)"
    media_volume="$(file_value "$shared_env" MEDIA_DATA_VOLUME cxapp-media-data)"
    [[ -n "$shared_user" && -n "$shared_password" && -n "$root_password" ]] || {
      echo "CXApp DB_USER, DB_PASSWORD, and MARIADB_ROOT_PASSWORD are required in $shared_env." >&2
      exit 78
    }
    set_file_value "$DEPLOY_ENV" DB_USER "$shared_user"
    set_file_value "$DEPLOY_ENV" DB_PASSWORD "$shared_password"
    set_file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_ROOT_PASSWORD "$root_password"
    set_file_value "$DEPLOY_ENV" NEOT_SHARED_REDIS_CONTAINER_NAME "$redis"
    set_file_value "$DEPLOY_ENV" NEOT_SHARED_MEDIA_CONTAINER_NAME "$media"
    set_file_value "$DEPLOY_ENV" NEOT_MEDIA_DATA_VOLUME "$media_volume"
    set_file_value "$DEPLOY_ENV" NEOT_MEDIA_DATA_VOLUME_EXTERNAL true
    set_file_value "$RUNTIME_ENV" REDIS_URL "$redis_url"
    echo "Synchronized protected MariaDB credentials from the CXApp deployment environment."
  fi
  safe_docker_name "$mariadb"
  container_is_running "$mariadb" || {
    echo "Existing MariaDB container is not running: $mariadb" >&2
    exit 69
  }
  redis="$(file_value "$DEPLOY_ENV" NEOT_SHARED_REDIS_CONTAINER_NAME cxapp-redis)"
  media="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MEDIA_CONTAINER_NAME cxapp-media)"
  for container in "$redis" "$media"; do
    safe_docker_name "$container"
    container_is_running "$container" || {
      echo "Existing shared container is not running: $container" >&2
      exit 69
    }
  done
  [[ -n "$(file_value "$RUNTIME_ENV" REDIS_URL)" ]] || {
    echo "The shared Redis URL is unavailable." >&2
    exit 78
  }
  docker volume inspect "$(file_value "$DEPLOY_ENV" NEOT_MEDIA_DATA_VOLUME)" >/dev/null 2>&1 || {
    echo "The shared File Browser data volume is unavailable." >&2
    exit 69
  }
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Existing Docker network was not found: $network" >&2
    exit 69
  }
  root_password="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_ROOT_PASSWORD)"
  [[ -n "$root_password" ]] || {
    echo "Shared MariaDB root password is unavailable." >&2
    echo "Configure NEOT_SHARED_MARIADB_ROOT_PASSWORD in $DEPLOY_ENV." >&2
    exit 78
  }
}

configure_shared_infrastructure() {
  echo
  echo "Existing infrastructure settings"
  echo "Running containers:"
  docker ps --format '  {{.Names}} ({{.Image}})' || true
  echo "Available Docker networks:"
  docker network ls --format '  {{.Name}}' || true
  prompt_setting "$DEPLOY_ENV" NEOT_SHARED_MARIADB_CONTAINER_NAME \
    "CXApp MariaDB container name" cxapp-mariadb
  prompt_setting "$DEPLOY_ENV" NEOT_NETWORK "CXApp Docker network" cxapp-network
  set_file_value "$DEPLOY_ENV" NEOT_NETWORK_EXTERNAL true
  prompt_setting "$DEPLOY_ENV" NEOT_SHARED_MARIADB_ENV_FILE \
    "CXApp protected deployment env" ../../cxapp/.container/deploy.env
  prompt_setting "$DEPLOY_ENV" NEOT_SHARED_REDIS_CONTAINER_NAME \
    "CXApp Redis container name" cxapp-redis
  prompt_setting "$DEPLOY_ENV" NEOT_SHARED_MEDIA_CONTAINER_NAME \
    "CXApp File Browser container name" cxapp-media
}

configure_dedicated_infrastructure() {
  local container replacement
  echo
  echo "Dedicated NEOT infrastructure settings"
  if [[ "$(file_value "$DEPLOY_ENV" NEOT_NETWORK_EXTERNAL false)" == true ]]; then
    set_file_value "$DEPLOY_ENV" NEOT_NETWORK neot-network
  fi
  set_file_value "$DEPLOY_ENV" NEOT_NETWORK_EXTERNAL false
  prompt_setting "$DEPLOY_ENV" NEOT_MARIADB_CONTAINER_NAME \
    "Dedicated MariaDB container name" neot-mariadb
  container="$(file_value "$DEPLOY_ENV" NEOT_MARIADB_CONTAINER_NAME neot-mariadb)"
  while docker container inspect "$container" >/dev/null 2>&1 &&
    ! container_is_compose_service "$container" \
      "$(file_value "$DEPLOY_ENV" NEOT_COMPOSE_PROJECT neot)" mariadb; do
    echo "Container name is already owned by existing infrastructure: $container" >&2
    read -r -p "Choose another dedicated MariaDB container name: " replacement
    set_file_value "$DEPLOY_ENV" NEOT_MARIADB_CONTAINER_NAME "$replacement"
    container="$replacement"
  done
  prompt_setting "$DEPLOY_ENV" NEOT_NETWORK "Dedicated Docker network" neot-network
  prompt_setting "$DEPLOY_ENV" NEOT_MARIADB_DATA_VOLUME \
    "MariaDB data volume" neot-mariadb-data
  set_file_value "$DEPLOY_ENV" NEOT_MEDIA_DATA_VOLUME_EXTERNAL false
  prompt_setting "$DEPLOY_ENV" NEOT_MEDIA_DATA_VOLUME \
    "NEOT media data volume" neot-media-data
  prompt_setting "$DEPLOY_ENV" MARIADB_IMAGE "MariaDB image" mariadb:11.8
  prompt_secret "$DEPLOY_ENV" MARIADB_ROOT_PASSWORD "Dedicated MariaDB root password"
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
  local container
  container="$(file_value "$DEPLOY_ENV" NEOT_API_CONTAINER_NAME neot-api)"
  docker exec "$container" sh -lc '
    test "$(id -u)" = "1000"
    command -v git >/dev/null
    test -w "$NEOT_CODEX_HOME"
    test -w "$NEOT_AGENT_WORKTREE_ROOT"
    test -w "$NEOT_AGENT_ALLOWED_ROOTS"
    test -w "$NEOT_STORAGE_PATH"
    test -w "$FILE_MANAGER_LOCAL_ROOT"
  '
}

safe_docker_name() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || {
    echo "Unsafe Docker resource name: $1" >&2
    exit 78
  }
}

validate_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] && ((port >= 1 && port <= 65535))
}

host_port_available() {
  local bind_address="$1" port="$2"
  node -e '
    const server = require("node:net").createServer();
    server.unref();
    server.once("error", () => process.exit(1));
    server.listen(Number(process.argv[2]), process.argv[1], () => {
      server.close(() => process.exit(0));
    });
  ' "$bind_address" "$port"
}

container_publishes_port() {
  local container="$1" bind_address="$2" port="$3"
  docker container inspect "$container" >/dev/null 2>&1 || return 1
  docker port "$container" 2>/dev/null | grep -Eq "(^|[[:space:]])${bind_address}:${port}$"
}

ensure_available_host_port() {
  local key="$1" label="$2" container="$3" bind_address port replacement
  bind_address="$(file_value "$DEPLOY_ENV" NEOT_BIND_ADDRESS 127.0.0.1)"
  while true; do
    port="$(file_value "$DEPLOY_ENV" "$key")"
    validate_port "$port" || {
      read -r -p "$label must be between 1 and 65535. Enter a valid port: " replacement
      set_file_value "$DEPLOY_ENV" "$key" "$replacement"
      continue
    }
    if host_port_available "$bind_address" "$port" ||
      container_publishes_port "$container" "$bind_address" "$port"; then
      return
    fi
    echo "$label $bind_address:$port is already in use." >&2
    read -r -p "Choose another $label: " replacement
    set_file_value "$DEPLOY_ENV" "$key" "$replacement"
  done
}

validate_deploy_environment() {
  local key
  for key in \
    NEOT_COMPOSE_PROJECT \
    NEOT_API_CONTAINER_NAME \
    NEOT_WEB_CONTAINER_NAME \
    NEOT_MARIADB_CONTAINER_NAME \
    NEOT_NETWORK \
    NEOT_MARIADB_DATA_VOLUME \
    NEOT_CODEX_STATE_VOLUME \
    NEOT_AGENT_WORKTREE_VOLUME \
    NEOT_AGENT_REPOSITORY_VOLUME \
    NEOT_MEDIA_DATA_VOLUME; do
    safe_docker_name "$(file_value "$DEPLOY_ENV" "$key")"
  done
  ensure_available_host_port \
    NEOT_API_HOST_PORT \
    "API host port" \
    "$(file_value "$DEPLOY_ENV" NEOT_API_CONTAINER_NAME neot-api)"
  ensure_available_host_port \
    NEOT_WEB_HOST_PORT \
    "Web host port" \
    "$(file_value "$DEPLOY_ENV" NEOT_WEB_CONTAINER_NAME neot-web)"
}

select_database_mode() {
  local volume="$1" answer confirmation
  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    printf 'fresh'
    return
  fi

  while true; do
    read -r -p "Reuse or freshly recreate NEOT MariaDB data? [reuse/fresh] " answer
    case "${answer:-reuse}" in
      reuse|Reuse|REUSE)
        printf 'reuse'
        return
        ;;
      fresh|Fresh|FRESH)
        read -r -p "Type FRESH $volume to delete only this NEOT volume: " confirmation
        [[ "$confirmation" == "FRESH $volume" ]] || {
          echo "Fresh database preparation cancelled." >&2
          exit 78
        }
        printf 'fresh'
        return
        ;;
      *)
        echo "Enter reuse or fresh." >&2
        ;;
    esac
  done
}

sql_string() {
  printf '%s' "$1" | sed "s/'/''/g"
}

reconcile_database_user() {
  local infrastructure_mode="$1" container database user password root_password escaped_password
  if [[ "$infrastructure_mode" == shared ]]; then
    container="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
    root_password="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_ROOT_PASSWORD)"
  else
    container="$(file_value "$DEPLOY_ENV" NEOT_MARIADB_CONTAINER_NAME neot-mariadb)"
    root_password="$(file_value "$DEPLOY_ENV" MARIADB_ROOT_PASSWORD)"
  fi
  database="$(file_value "$RUNTIME_ENV" DB_NAME)"
  user="$(file_value "$RUNTIME_ENV" DB_USER)"
  password="$(file_value "$RUNTIME_ENV" DB_PASSWORD)"
  escaped_password="$(sql_string "$password")"
  safe_docker_name "$container"

  if ! MSYS_NO_PATHCONV=1 docker exec -i -e MYSQL_PWD="$root_password" "$container" \
    mariadb --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$database\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$user'@'%' IDENTIFIED BY '$escaped_password';
ALTER USER '$user'@'%' IDENTIFIED BY '$escaped_password';
GRANT ALL PRIVILEGES ON \`$database\`.* TO '$user'@'%';
FLUSH PRIVILEGES;
SQL
  then
    echo "Could not reconcile the NEOT MariaDB application user." >&2
    echo "For reused data, verify MARIADB_ROOT_PASSWORD in $DEPLOY_ENV." >&2
    exit 78
  fi
}

connect_shared_mariadb() {
  local network container
  network="$(file_value "$DEPLOY_ENV" NEOT_NETWORK cxapp-network)"
  container="$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
  safe_docker_name "$network"
  safe_docker_name "$container"
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Existing Docker network was not found: $network" >&2
    exit 69
  }
  if ! docker inspect --format \
    '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{println}}{{end}}' \
    "$container" | grep -Fxq "$network"; then
    docker network connect "$network" "$container"
    echo "Connected existing MariaDB container $container to external network $network."
  fi
}

connect_shared_services() {
  local network container
  network="$(file_value "$DEPLOY_ENV" NEOT_NETWORK cxapp-network)"
  for container in \
    "$(file_value "$DEPLOY_ENV" NEOT_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)" \
    "$(file_value "$DEPLOY_ENV" NEOT_SHARED_REDIS_CONTAINER_NAME cxapp-redis)" \
    "$(file_value "$DEPLOY_ENV" NEOT_SHARED_MEDIA_CONTAINER_NAME cxapp-media)"; do
    safe_docker_name "$container"
    if ! docker inspect --format \
      '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{println}}{{end}}' \
      "$container" | grep -Fxq "$network"; then
      docker network connect "$network" "$container"
      echo "Connected existing shared container $container to network $network."
    fi
  done
}

require_command node
require_command docker
docker info >/dev/null 2>&1 || {
  echo "Docker Engine is not reachable." >&2
  exit 69
}
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 is required." >&2
  exit 69
}

ensure_runtime_environment_file
prepare_deploy_environment
configure_deploy_environment
infrastructure_mode="$(select_infrastructure_mode)"
if [[ "$infrastructure_mode" == shared ]]; then
  configure_shared_infrastructure
  prepare_shared_infrastructure
else
  configure_dedicated_infrastructure
fi
prepare_runtime_environment "$infrastructure_mode"
validate_deploy_environment
configure_runtime_environment
validate_runtime_environment

if [[ "$infrastructure_mode" == dedicated ]]; then
  database_volume="$(file_value "$DEPLOY_ENV" NEOT_MARIADB_DATA_VOLUME neot-mariadb-data)"
  safe_docker_name "$database_volume"
  database_mode="$(select_database_mode "$database_volume")"
  infrastructure_label="dedicated NEOT network and MariaDB"
else
  database_volume=""
  database_mode="reuse existing MariaDB"
  infrastructure_label="reuse existing Docker network and MariaDB"
fi

compose config --quiet

echo
echo "Standalone NEOT deployment plan"
echo "  Runtime env: $RUNTIME_ENV"
echo "  Deploy env: $DEPLOY_ENV"
echo "  Source: self-contained NEOT monorepo"
echo "  Infrastructure: $infrastructure_label"
echo "  MariaDB data: $database_mode"
echo "  Images: internal Framework/UI -> NEOT Platform API/Web"
echo "  Runtime: NEOT API, NEOT Web, selected MariaDB, Redis, and File Browser storage"
echo "  Agent storage: separate Codex state, repository, and worktree volumes"
echo "  Shared services stay owned by CXApp. NEOT uses isolated database and storage paths."
read -r -p "Build and apply this standalone NEOT installation? [Y/n] " confirmation
case "${confirmation:-Y}" in
  y|Y|yes|Yes|YES) ;;
  *)
    echo "Setup cancelled before Docker changes."
    exit 0
    ;;
esac

if [[ "$infrastructure_mode" == dedicated && "$database_mode" == fresh ]] &&
  docker volume inspect "$database_volume" >/dev/null 2>&1; then
  compose down --remove-orphans
  docker volume rm "$database_volume" >/dev/null
fi

compose build api web
echo "Verifying Git and writable Agent runtime volumes in the API image."
verify_agent_runtime_image
if [[ "$infrastructure_mode" == shared ]]; then
  connect_shared_services
  reconcile_database_user shared
  compose up -d api web --no-build --no-deps --force-recreate --wait --wait-timeout 300
else
  compose up -d mariadb --wait --wait-timeout 180
  reconcile_database_user dedicated
  compose up -d api web --no-build --force-recreate --wait --wait-timeout 300
fi

echo "Verifying the running Agent runtime."
verify_agent_runtime_container

echo
echo "NEOT standalone installation completed."
echo "Web: http://$(file_value "$DEPLOY_ENV" NEOT_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" NEOT_WEB_HOST_PORT 9260)/"
echo "API health: http://$(file_value "$DEPLOY_ENV" NEOT_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" NEOT_API_HOST_PORT 9250)/health"
echo "Agent repositories: /srv/neot/repositories inside the API container"
