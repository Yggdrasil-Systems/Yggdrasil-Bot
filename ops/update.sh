#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

info "Starting World Tree Update..."

# 1. Clean Working Tree Check
if git diff --quiet && git diff --cached --quiet; then
  info "Working tree is clean."
else
  fail "Local changes detected. Commit or discard them before updating."
fi

# 2. Verify
run_cmd bash ops/verify.sh

# 3. Backup
info "Backing up configuration..."
run_cmd bash ops/backup.sh

# 4. Fetch & Pull
info "Fetching updates from remote..."
run_cmd git fetch
info "Pulling updates (fast-forward only)..."
run_cmd git pull --ff-only

# 5. NPM CI
info "Installing dependencies..."
run_cmd npm ci

# 6. Lint & Test
info "Running linting..."
run_cmd npm run lint
info "Running automated tests..."
run_cmd npm test

# 7. Register Commands (assuming the script exists in package.json)
if grep -q '"register:commands"' package.json; then
  info "Registering application commands..."
  run_cmd npm run register:commands
else
  warn "No 'register:commands' script found in package.json. Skipping."
fi

# 8. Restart & Verify
info "Reloading via provider [$(provider_name)]..."
provider_pre_restart
service_reload
provider_post_restart

info "Checking application health..."
run_cmd bash ops/health.sh

info "Displaying info..."
run_cmd bash ops/info.sh

success "Update process completed successfully!"
