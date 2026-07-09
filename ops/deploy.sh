#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

RUN_TESTS=false
if [[ "$*" == *"--test"* ]] || [[ "$*" == *"--full"* ]]; then
  RUN_TESTS=true
fi

info "Starting World Tree Deployment via provider [$(provider_name)]..."

# 1. Verify
run_cmd bash ops/verify.sh

# 2. NPM CI
info "Installing dependencies..."
run_cmd npm ci

# 3. Optional Tests
if [ "$RUN_TESTS" = true ]; then
  info "Running automated tests..."
  run_cmd npm test
else
  info "Skipping tests (run with --test to enable)."
fi

# 4. Install Provider Service
info "Installing service via provider..."
service_install

# 5. Start
info "Starting service..."
provider_pre_start
service_start
provider_post_start

success "Deployment complete! Run 'npm run ops:info' to check the status."
