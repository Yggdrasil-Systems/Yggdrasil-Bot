#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

if [ $# -eq 0 ]; then
  fail "Usage: ops/rollback.sh <git-tag-or-commit>"
fi

TARGET="$1"

info "Preparing rollback to: $TARGET"

if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Working tree is dirty. Stash or commit changes before rollback."
fi

info "Fetching latest tags..."
run_cmd git fetch --tags

if ! git rev-parse --verify "$TARGET" &> /dev/null; then
  fail "Git target '$TARGET' not found."
fi

info "Executing rollback..."
run_cmd git checkout "$TARGET"

if [ "$DRY_RUN" = false ]; then
  warn "============================================================"
  warn "Repository is now in detached HEAD state!"
  warn "To return to normal development, check out a branch:"
  warn "  git checkout master"
  warn "============================================================"
fi

info "Installing dependencies for $TARGET..."
run_cmd npm ci

info "Restarting process..."
run_cmd bash ops/restart.sh

success "Rollback complete."
