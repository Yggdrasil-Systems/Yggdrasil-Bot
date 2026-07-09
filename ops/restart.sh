#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

info "Restarting via provider [$(provider_name)]..."

provider_pre_restart
service_restart
provider_post_restart

info "Restart complete. Current status:"
run_cmd bash ops/info.sh
