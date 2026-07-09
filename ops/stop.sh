#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

info "Stopping via provider [$(provider_name)]..."

provider_pre_stop
service_stop
provider_post_stop

success "Stopped."
