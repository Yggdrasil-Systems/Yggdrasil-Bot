#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

info "Running System Health Checks via provider [$(provider_name)]..."

FAILED=0

function check_pass() {
  echo -e "  [${GREEN}PASS${RESTORE}] $1"
}

function check_fail() {
  echo -e "  [${RED}FAIL${RESTORE}] $1"
  FAILED=1
}

# 1. Provider Process Health
if backend_process_health; then
  check_pass "Service process is active/online"
else
  check_fail "Service process is offline or missing"
fi

# 2. Provider Runtime Health (API, Restart loops, etc)
if backend_runtime_health; then
  check_pass "Runtime health checks passed"
else
  check_fail "Runtime health checks failed"
fi

# 3. Disk Usage
AVAILABLE_DISK=$(df -m . | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_DISK" -lt 100 ]; then
  check_fail "Critically low disk space! (${AVAILABLE_DISK}MB)"
else
  check_pass "Disk space ok (${AVAILABLE_DISK}MB free)"
fi

# 4. Memory
if command -v free &> /dev/null; then
  AVAILABLE_MEM=$(free -m | awk '/^Mem:/{print $7}')
  if [ -n "$AVAILABLE_MEM" ] && [ "$AVAILABLE_MEM" -lt 100 ]; then
    check_fail "Critically low memory! (${AVAILABLE_MEM}MB free)"
  else
    check_pass "Memory ok (${AVAILABLE_MEM}MB available)"
  fi
fi

# 5. Log Directory
if [ -d "$LOG_DIR" ]; then
  check_pass "Log directory exists"
else
  check_fail "Log directory '$LOG_DIR' is missing"
fi

echo "----------------------------------------"
if [ $FAILED -eq 0 ]; then
  success "Overall Health: PASS"
  exit 0
else
  fail "Overall Health: FAIL"
fi
