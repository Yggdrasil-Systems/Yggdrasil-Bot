#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

if [ $# -eq 0 ]; then
  fail "Usage: ops/restore.sh <path/to/backup.tar.gz>"
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  fail "Backup file '$BACKUP_FILE' does not exist."
fi

info "Restoring from $BACKUP_FILE..."

if [ "$DRY_RUN" = false ]; then
  read -p "This will overwrite current config and operational files. Are you sure? [y/N]: " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    fail "Restore cancelled."
  fi
fi

run_cmd tar -xzf "$BACKUP_FILE"

success "Restore complete. It is recommended to run 'bash ops/restart.sh'."
