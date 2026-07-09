#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

echo -e "${CYAN}Provider:${RESTORE}      $(provider_name) (v$(provider_version))"

service_status
