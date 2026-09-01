#!/bin/sh
set -eu

if [ "$(id -u)" = "0" ]; then
  for directory in "$NEOT_CODEX_HOME" "$NEOT_AGENT_WORKTREE_ROOT" "$NEOT_AGENT_ALLOWED_ROOTS" \
    "$NEOT_STORAGE_PATH" "$FILE_MANAGER_LOCAL_ROOT"; do
    mkdir -p "$directory"
    marker="$directory/.neot-node-owned"
    if [ ! -f "$marker" ]; then
      chown -R node:node "$directory"
      touch "$marker"
      chown node:node "$marker"
    fi
  done
  exec gosu node "$@"
fi

for directory in "$NEOT_CODEX_HOME" "$NEOT_AGENT_WORKTREE_ROOT" "$NEOT_AGENT_ALLOWED_ROOTS" \
  "$NEOT_STORAGE_PATH" "$FILE_MANAGER_LOCAL_ROOT"; do
  test -d "$directory" && test -w "$directory" || {
    echo "NEOT runtime directory is unavailable or not writable: $directory" >&2
    exit 77
  }
done
exec "$@"
