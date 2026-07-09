#!/usr/bin/env bash
export PROVIDER_API=1

provider_name() { echo "systemd"; }
provider_version() { echo "1.0"; }
provider_description() { echo "Native Linux service manager"; }

provider_capabilities() {
  echo "install"
  echo "reload"
  echo "logs"
  echo "health"
}

# Lifecycle Hooks
provider_pre_start() { :; }
service_start() {
  run_cmd sudo systemctl start "$SERVICE_NAME"
}
provider_post_start() { :; }

provider_pre_stop() { :; }
service_stop() {
  run_cmd sudo systemctl stop "$SERVICE_NAME"
}
provider_post_stop() { :; }

provider_pre_restart() { :; }
service_restart() {
  run_cmd sudo systemctl restart "$SERVICE_NAME"
}
service_reload() {
  run_cmd sudo systemctl reload-or-restart "$SERVICE_NAME"
}
provider_post_restart() { :; }

# Installation
service_install() {
  run_cmd sudo systemctl enable "$SERVICE_NAME"
}
service_uninstall() {
  run_cmd sudo systemctl disable "$SERVICE_NAME"
}

# State
service_is_running() {
  local active_state
  active_state=$(systemctl show -p ActiveState --value "$SERVICE_NAME" 2>/dev/null || echo "unknown")
  if [ "$active_state" = "active" ]; then
    return 0
  else
    return 1
  fi
}

service_status() {
  if ! command -v systemctl &> /dev/null; then
    echo "systemd not available."
    return
  fi
  
  local active_state
  active_state=$(systemctl show -p ActiveState --value "$SERVICE_NAME" 2>/dev/null || echo "unknown")
  local uptime_start
  uptime_start=$(systemctl show -p ExecMainStartTimestamp --value "$SERVICE_NAME" 2>/dev/null || echo "")
  local restarts
  restarts=$(systemctl show -p NRestarts --value "$SERVICE_NAME" 2>/dev/null || echo "0")

  echo -e "${CYAN}Service State:${RESTORE}  $active_state"
  echo -e "${CYAN}Uptime Start:${RESTORE}   ${uptime_start:-N/A}"
  echo -e "${CYAN}Restarts:${RESTORE}       $restarts"
}

provider_logs() {
  local log_type=${1:-"all"}
  if [ "$log_type" = "error" ]; then
    run_cmd journalctl -u "$SERVICE_NAME" -p err -f
  else
    run_cmd journalctl -u "$SERVICE_NAME" -f
  fi
}

# Health & Validation
backend_process_health() {
  if service_is_running; then
    return 0
  else
    return 1
  fi
}

backend_runtime_health() {
  # API check logic
  ENABLE_API=$(grep -E "^ENABLE_API=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "false")
  if [ "$ENABLE_API" = "true" ]; then
    if curl -sSf -m 2 http://127.0.0.1:3000/v1/health > /dev/null; then
      echo "API: Responding"
    else
      echo "API: Not responding or not implemented"
      # We return 0 so it doesn't fail the entire script just yet
    fi
  fi
  
  # Mongo and Discord are ideally checked through the /health endpoint, 
  # so we leave those to the API ping above for now.
  return 0
}

backend_verify() {
  check_cmd "systemctl"
}

provider_self_test() {
  local failed=0
  echo "--- Systemd Provider Self Test ---"
  
  if command -v systemctl &> /dev/null; then
    echo -e "  [${GREEN}OK${RESTORE}] systemctl exists"
  else
    echo -e "  [${RED}ERR${RESTORE}] systemctl missing"
    failed=1
  fi

  if systemctl list-unit-files | grep -q "^${SERVICE_NAME}"; then
    echo -e "  [${GREEN}OK${RESTORE}] service file '$SERVICE_NAME' exists"
  else
    echo -e "  [${RED}ERR${RESTORE}] service file '$SERVICE_NAME' not found"
    failed=1
  fi
  
  return $failed
}
