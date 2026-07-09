#!/usr/bin/env bash
set -Eeuo pipefail

# 1. Load Constants
source "$(dirname "$0")/constants.sh"

# 2. Load Config
source "$(dirname "$0")/config.sh"

# 3. Logging Helpers & Colors
RESTORE='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'

function info() {
  echo -e "${CYAN}[INFO]${RESTORE} $1"
}

function success() {
  echo -e "${GREEN}[SUCCESS]${RESTORE} $1"
}

function warn() {
  echo -e "${YELLOW}[WARN]${RESTORE} $1"
}

function error() {
  echo -e "${RED}[ERROR]${RESTORE} $1" >&2
}

function fail() {
  error "$1"
  exit 1
}

# 4. Global flags parsing
export DRY_RUN=false
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    export DRY_RUN=true
  fi
done

# 5. Helpers
function run_cmd() {
  local cmd_string="$*"
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${RESTORE} Would execute: $cmd_string"
  else
    "$@"
  fi
}

function check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    fail "Required command '$1' is not installed or not in PATH."
  fi
}

function require_project_root() {
  if [ ! -f "package.json" ]; then
    fail "Must be run from the project root (where package.json exists)."
  fi
}

function get_timestamp() {
  date +"%Y-%m-%d_%H-%M-%S"
}

# 6. Load Provider Plugin
PROVIDER_FILE="$(dirname "$0")/providers/${OPS_PROVIDER}.sh"
if [ ! -f "$PROVIDER_FILE" ]; then
  fail "Configured provider '${OPS_PROVIDER}' not found at $PROVIDER_FILE"
fi

source "$PROVIDER_FILE"

if [ -z "${PROVIDER_API:-}" ] || [ "$PROVIDER_API" != "$EXPECTED_PROVIDER_API" ]; then
  fail "Provider '${OPS_PROVIDER}' requires API version ${PROVIDER_API:-UNKNOWN}, expected ${EXPECTED_PROVIDER_API}."
fi
