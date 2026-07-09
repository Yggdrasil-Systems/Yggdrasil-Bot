#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

info "Starting via provider [$(provider_name)]..."

provider_pre_start
service_start
provider_post_start

success "Started."
