#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

TIMESTAMP=$(get_timestamp)
BACKUP_FILE="${BACKUP_DIR}/world-tree-backup-${TIMESTAMP}.tar.gz"

info "Creating configuration backup..."

run_cmd mkdir -p "$BACKUP_DIR"

TARGETS=(
  ".env"
  "ecosystem.config.cjs"
  "package.json"
  "package-lock.json"
  "ops/"
  "README.md"
)

EXISTING_TARGETS=()
for target in "${TARGETS[@]}"; do
  if [ -e "$target" ]; then
    EXISTING_TARGETS+=("$target")
  else
    warn "Backup target '$target' not found, skipping."
  fi
done

if [ ${#EXISTING_TARGETS[@]} -eq 0 ]; then
  fail "No valid backup targets found."
fi

run_cmd tar -czf "$BACKUP_FILE" "${EXISTING_TARGETS[@]}"

success "Backup created successfully at: $BACKUP_FILE"
