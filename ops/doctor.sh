#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

echo "World Tree Doctor"
echo "================="
echo ""

# We will collect exit codes
ENV_STATUS=0
PROV_STATUS=0
RUN_STATUS=0
RES_STATUS=0

function report_item() {
  local code=$1
  local msg=$2
  if [ "$code" -eq 0 ]; then
    echo -e "  [${GREEN}✓${RESTORE}] $msg"
  else
    echo -e "  [${RED}✗${RESTORE}] $msg"
  fi
}

# --- Environment ---
echo "Environment"
# Node
if command -v node &> /dev/null; then
  report_item 0 "Node $(node -v)"
else
  report_item 1 "Node missing"
  ENV_STATUS=1
fi

# NPM
if command -v npm &> /dev/null; then
  report_item 0 "npm $(npm -v | head -n1)"
else
  report_item 1 "npm missing"
  ENV_STATUS=1
fi

# Git
if command -v git &> /dev/null; then
  report_item 0 "Git exists"
else
  report_item 1 "Git missing"
  ENV_STATUS=1
fi

# Config
if [ "${DRY_RUN:-}" = true ]; then
  report_item 0 ".env (skipped due to dry-run)"
elif [ -f ".env" ] && [ -f "ops/lib/config.sh" ]; then
  report_item 0 "Config exists"
else
  report_item 1 "Config missing"
  ENV_STATUS=1
fi
echo ""

# --- Provider ---
echo "Provider"
report_item 0 "$(provider_name)"

# We run provider self test (we suppress stdout to keep it clean, only want exit code)
if provider_self_test >/dev/null 2>&1; then
  report_item 0 "Self-test passed"
else
  report_item 1 "Self-test failed"
  PROV_STATUS=1
fi

# Service Enabled / Running
if backend_process_health >/dev/null 2>&1; then
  report_item 0 "Service active"
else
  report_item 1 "Service offline"
  PROV_STATUS=1
fi
echo ""

# --- Runtime ---
echo "Runtime"
if backend_runtime_health >/dev/null 2>&1; then
  report_item 0 "API Responding"
else
  report_item 1 "API Check failed"
  RUN_STATUS=1
fi

# (We'll mock Discord/Mongo for now since it's v1. True tests happen in CI or via API ping)
report_item 0 "Discord (Delegated)"
report_item 0 "Mongo (Delegated)"
echo ""

# --- Resources ---
echo "Resources"
# Disk
AVAILABLE_DISK=$(df -m . | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_DISK" -lt 500 ]; then
  report_item 1 "Disk space low (${AVAILABLE_DISK}MB)"
  RES_STATUS=1
else
  report_item 0 "Disk space OK"
fi

# RAM
if command -v free &> /dev/null; then
  AVAILABLE_MEM=$(free -m | awk '/^Mem:/{print $7}')
  if [ -n "$AVAILABLE_MEM" ] && [ "$AVAILABLE_MEM" -lt 200 ]; then
    report_item 1 "RAM low (${AVAILABLE_MEM}MB)"
    RES_STATUS=1
  else
    report_item 0 "RAM OK"
  fi
else
  report_item 0 "RAM (Skipped)"
fi

# Logs
if [ -w "$LOG_DIR" ]; then
  report_item 0 "Logs writable"
else
  report_item 1 "Logs not writable"
  RES_STATUS=1
fi
echo ""

# --- Overall ---
echo "Overall Summary"
echo "==============="

function print_summary() {
  local name=$1
  local status=$2
  if [ "$status" -eq 0 ]; then
    printf "%-16s %bPASS%b\n" "$name" "$GREEN" "$RESTORE"
  else
    printf "%-16s %bFAIL%b\n" "$name" "$RED" "$RESTORE"
  fi
}

print_summary "Environment" "$ENV_STATUS"
print_summary "Provider" "$PROV_STATUS"
print_summary "Runtime" "$RUN_STATUS"
print_summary "Resources" "$RES_STATUS"

echo ""
OVERALL=$((ENV_STATUS + PROV_STATUS + RUN_STATUS + RES_STATUS))
if [ "$OVERALL" -eq 0 ]; then
  printf "%-16s %bPASS%b\n" "Overall" "$GREEN" "$RESTORE"
  exit 0
else
  printf "%-16s %bFAIL%b\n" "Overall" "$RED" "$RESTORE"
  exit 1
fi
