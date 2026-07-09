#!/usr/bin/env bash
set -Eeuo pipefail

source "$(dirname "$0")/lib/common.sh"
require_project_root

if [ $# -eq 0 ]; then
  fail "Usage: ops/switch.sh <provider_name>"
fi

NEW_PROVIDER="$1"
PROVIDER_FILE="$(dirname "$0")/lib/providers/${NEW_PROVIDER}.sh"

if [ ! -f "$PROVIDER_FILE" ]; then
  fail "Provider '${NEW_PROVIDER}' does not exist at $PROVIDER_FILE"
fi

CONFIG_FILE="$(dirname "$0")/lib/config.sh"

if [ "$DRY_RUN" = true ]; then
  info "[DRY RUN] Would set OPS_PROVIDER=$NEW_PROVIDER in $CONFIG_FILE"
else
  # Use sed to replace the OPS_PROVIDER line
  # We do this safely without perl or complex seds to maintain compat on Oracle Linux
  run_cmd sed -i "s/^OPS_PROVIDER=.*/OPS_PROVIDER=$NEW_PROVIDER/" "$CONFIG_FILE"
fi

success "Successfully switched to provider: $NEW_PROVIDER"
