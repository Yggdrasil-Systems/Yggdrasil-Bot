#!/usr/bin/env bash
export PROVIDER_API=1

provider_name() { echo "pm2" }
provider_version() { echo "1.0" }
provider_description() { echo "Node.js process manager" }

provider_capabilities() {
  cat <<EOF
reload
logs
install
health
EOF
}

# Lifecycle Hooks
provider_pre_start() { :; }
service_start() {
  run_cmd pm2 start ecosystem.config.cjs
}
provider_post_start() {
  run_cmd pm2 save
}

provider_pre_stop() { :; }
service_stop() {
  run_cmd pm2 stop "$APP_NAME"
}
provider_post_stop() { :; }

provider_pre_restart() { :; }
service_restart() {
  run_cmd pm2 restart "$APP_NAME" --update-env
}
service_reload() {
  run_cmd pm2 reload "$APP_NAME" --update-env
}
provider_post_restart() {
  run_cmd pm2 save
}

# Installation
service_install() {
  info "To enable PM2 at boot, please manually run 'pm2 startup' if you haven't already."
  run_cmd pm2 save
}
service_uninstall() {
  run_cmd pm2 delete "$APP_NAME" || true
  run_cmd pm2 save
}

# State
service_is_running() {
  if ! command -v pm2 &> /dev/null; then return 1; fi
  local status
  status=$(pm2 jlist 2>/dev/null | grep "\"name\":\"$APP_NAME\"" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p' || echo "unknown")
  if [ "$status" = "online" ]; then
    return 0
  else
    return 1
  fi
}

service_status() {
  if ! command -v pm2 &> /dev/null; then
    echo "pm2 not available."
    return
  fi
  
  local status="unknown"
  local uptime="0"
  local restarts="0"
  
  local process_info
  process_info=$(pm2 jlist 2>/dev/null | grep "\"name\":\"$APP_NAME\"" || echo "")
  
  if [ -n "$process_info" ]; then
    status=$(echo "$process_info" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
    uptime=$(echo "$process_info" | sed -n 's/.*"pm_uptime":\([0-9]*\).*/\1/p')
    restarts=$(echo "$process_info" | sed -n 's/.*"restart_time":\([0-9]*\).*/\1/p')
  fi

  local uptime_formatted="0d 0h 0m"
  if [ -n "$uptime" ] && [ "$uptime" -gt 0 ]; then
    local now
    now=$(date +%s000)
    local diff=$((now - uptime))
    local diff_sec=$((diff / 1000))
    uptime_formatted=$(awk -v t=$diff_sec 'BEGIN{print int(t/86400)"d "int(t%86400/3600)"h "int(t%3600/60)"m"}')
  fi

  echo -e "${CYAN}Service State:${RESTORE}  $status"
  echo -e "${CYAN}Uptime:${RESTORE}         $uptime_formatted"
  echo -e "${CYAN}Restarts:${RESTORE}       $restarts"
}

provider_logs() {
  local log_type=${1:-"all"}
  case "$log_type" in
    "error")
      run_cmd pm2 logs "$APP_NAME" --err
      ;;
    "out")
      run_cmd pm2 logs "$APP_NAME" --out
      ;;
    "pm2")
      run_cmd pm2 logs PM2
      ;;
    "all"|*)
      run_cmd pm2 logs "$APP_NAME"
      ;;
  esac
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
    if curl -sSf -m 2 http://127.0.0.1:3000/health > /dev/null; then
      echo "API: Responding"
    else
      echo "API: Not responding or not implemented"
    fi
  fi
  
  # PM2 specific runtime check: Restart loops
  local restarts="0"
  restarts=$(pm2 jlist 2>/dev/null | grep "\"name\":\"$APP_NAME\"" | sed -n 's/.*"restart_time":\([0-9]*\).*/\1/p' || echo "0")
  if [ -n "$restarts" ] && [ "$restarts" -gt 50 ]; then
    echo "PM2: High restart count detected ($restarts)"
    return 1
  fi
  
  return 0
}

backend_verify() {
  check_cmd "pm2"
}

provider_self_test() {
  local failed=0
  echo "--- PM2 Provider Self Test ---"
  
  if command -v pm2 &> /dev/null; then
    echo -e "  [${GREEN}OK${RESTORE}] pm2 exists"
  else
    echo -e "  [${RED}ERR${RESTORE}] pm2 missing"
    failed=1
  fi

  if [ -f "ecosystem.config.cjs" ]; then
    echo -e "  [${GREEN}OK${RESTORE}] ecosystem.config.cjs exists"
  else
    echo -e "  [${RED}ERR${RESTORE}] ecosystem.config.cjs not found"
    failed=1
  fi
  
  if pm2 ping &> /dev/null; then
    echo -e "  [${GREEN}OK${RESTORE}] pm2 daemon reachable"
  else
    echo -e "  [${RED}ERR${RESTORE}] pm2 daemon NOT reachable"
    failed=1
  fi
  
  return $failed
}
