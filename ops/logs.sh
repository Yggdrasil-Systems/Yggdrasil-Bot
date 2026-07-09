#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

info "Tailing logs via provider [$(provider_name)]..."

provider_logs "$@"
