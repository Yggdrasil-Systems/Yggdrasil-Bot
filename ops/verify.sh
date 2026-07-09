#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

info "Running pre-flight environment verification..."

# 1. Config & Env Files
if [ "$DRY_RUN" = true ]; then
  info "[DRY RUN] Skipping .env presence check in dry-run mode."
else
  if [ ! -f ".env" ]; then
    fail ".env file is missing! Cannot proceed without environment variables."
  fi

  # 2. Environment Variable Presence
  set -a
  source <(grep -v '^#' .env)
  set +a

  if [ -z "${DISCORD_TOKEN:-}" ]; then
    fail "DISCORD_TOKEN is not set in .env"
  fi
  if [ -z "${CLIENT_ID:-}" ]; then
    fail "CLIENT_ID is not set in .env"
  fi
  if [ -z "${MONGO_URI:-}" ]; then
    fail "MONGO_URI is not set in .env"
  fi
fi

# 3. System Constraints
AVAILABLE_DISK=$(df -m . | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_DISK" -lt 500 ]; then
  warn "Low disk space! Only ${AVAILABLE_DISK}MB available on current partition."
fi

if command -v free &> /dev/null; then
  AVAILABLE_MEM=$(free -m | awk '/^Mem:/{print $7}')
  if [ -n "$AVAILABLE_MEM" ] && [ "$AVAILABLE_MEM" -lt 200 ]; then
    warn "Low memory! Only ${AVAILABLE_MEM}MB available."
  fi
fi

# 4. Git Status
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Unknown")
info "Current Git Branch: $GIT_BRANCH"

if git diff --quiet && git diff --cached --quiet; then
  success "Working tree clean."
else
  warn "Working tree is NOT clean. Local changes exist."
fi

# 5. Provider-Specific Verification
info "Verifying provider: $(provider_name)..."
backend_verify

success "Environment verification passed."
