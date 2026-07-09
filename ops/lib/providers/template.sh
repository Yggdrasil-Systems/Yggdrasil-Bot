#!/usr/bin/env bash
# Provider Template

export PROVIDER_API=1

provider_name() { echo "template"; }
provider_version() { echo "1.0"; }
provider_description() { echo "Template Provider"; }

provider_capabilities() {
  echo ""
}

# Lifecycle Hooks
provider_pre_start() { :; }
service_start() { :; }
provider_post_start() { :; }

provider_pre_stop() { :; }
service_stop() { :; }
provider_post_stop() { :; }

provider_pre_restart() { :; }
service_restart() { :; }
service_reload() { :; }
provider_post_restart() { :; }

# Installation
service_install() { :; }
service_uninstall() { :; }

# State
service_is_running() { return 1; }
service_status() { :; }
provider_logs() { :; }

# Health & Validation
backend_process_health() { return 1; }
backend_runtime_health() { return 1; }
backend_verify() { :; }
provider_self_test() { :; }
