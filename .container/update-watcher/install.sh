#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${NEOT_WATCHER_REPO_DIR:-/home/neot}"
SOURCE_DIR="$REPO_DIR/.container/update-watcher"
[[ "$(id -u)" == 0 ]] || { echo "Run this installer as root." >&2; exit 77; }
command -v systemctl >/dev/null 2>&1 || { echo "systemd is required." >&2; exit 69; }
[[ -f "$SOURCE_DIR/neot-update-watcher.sh" ]] || { echo "Watcher source is missing: $SOURCE_DIR" >&2; exit 78; }

install -o root -g root -m 0750 "$SOURCE_DIR/neot-update-watcher.sh" /usr/local/sbin/neot-update-watcher
install -o root -g root -m 0644 "$SOURCE_DIR/neot-update-watcher.service" /etc/systemd/system/neot-update-watcher.service
install -o root -g root -m 0644 "$SOURCE_DIR/neot-update-watcher.timer" /etc/systemd/system/neot-update-watcher.timer
install -d -o root -g root -m 0750 /var/lib/neot-update-watcher
systemctl daemon-reload
systemctl enable --now neot-update-watcher.timer
systemctl status neot-update-watcher.timer --no-pager

echo "Installed NEOT update watcher. Inspect it with:"
echo "  systemctl start neot-update-watcher.service"
echo "  journalctl -u neot-update-watcher.service -n 100 --no-pager"
