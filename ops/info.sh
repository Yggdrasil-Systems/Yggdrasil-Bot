#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

echo "World Tree Operations"
echo "====================="
echo ""
echo -e "${CYAN}Version${RESTORE}        $OPS_VERSION"
echo -e "${CYAN}Provider${RESTORE}       $(provider_name) (v$(provider_version))"
echo -e "${CYAN}Capabilities${RESTORE}   $(provider_capabilities | tr '\n' ' ')"
echo ""

# System Info
OS_INFO=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d '"' -f 2 || echo "Unknown Linux")
if [ "$OS_INFO" = "Unknown Linux" ] && command -v systeminfo &> /dev/null; then
  OS_INFO="Windows"
fi
NODE_VER=$(node -v 2>/dev/null || echo "Missing")
NPM_VER=$(npm -v 2>/dev/null || echo "Missing")
echo -e "${CYAN}OS${RESTORE}             $OS_INFO"
echo -e "${CYAN}Node${RESTORE}           $NODE_VER"
echo -e "${CYAN}npm${RESTORE}            $NPM_VER"
echo ""

# Git Info
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Unknown")
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "Unknown")
echo -e "${CYAN}Git${RESTORE}            $GIT_BRANCH"
echo -e "${CYAN}Commit${RESTORE}         $GIT_SHA"
echo ""

# Runtime Health
if service_is_running; then
  echo -e "${CYAN}Service${RESTORE}        active"
else
  echo -e "${CYAN}Service${RESTORE}        offline"
fi

# We invoke the provider's runtime health check
backend_runtime_health

echo ""
# Hardware
if command -v free &> /dev/null; then
  MEM_USAGE=$(free -m | awk 'NR==2{print $3}')
  echo -e "${CYAN}Memory${RESTORE}         ${MEM_USAGE} MB used"
fi

if command -v uptime &> /dev/null; then
  CPU_LOAD=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | xargs || echo "0")
  echo -e "${CYAN}CPU Load${RESTORE}       ${CPU_LOAD}"
  UPTIME_SYS=$(uptime -p 2>/dev/null || uptime | awk '{print $3 " " $4}' | sed 's/,//')
  echo -e "${CYAN}Uptime${RESTORE}         $UPTIME_SYS"
fi

echo ""
echo -e "${CYAN}Log directory${RESTORE}"
echo "$(pwd)/$LOG_DIR"
echo ""
echo -e "${CYAN}Backup directory${RESTORE}"
echo "$(pwd)/$BACKUP_DIR"
echo ""
