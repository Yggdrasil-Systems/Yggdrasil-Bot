# Day-to-Day Runbook

This document details routine interactions, operational health checks, and debugging procedures using the Provider Operations SDK.

## Checking the Status
Whenever you log into the server to investigate an issue, this is the first command you run:
```bash
npm run ops:info
```
It prints a unified dashboard showing exactly which provider is active (`systemd` or `pm2`), node version, memory usage, API uptime, git commit hash, and whether the provider's health checks passed.

## Debugging

**The Application Crashed**
1. Run `npm run ops:info` to see if the process is marked as `offline` or if restarts are skyrocketing.
2. View the provider-native logs via the SDK:
   ```bash
   npm run ops:logs -- error
   ```
3. Run the doctor script to perform a full dependency and disk space check:
   ```bash
   npm run ops:doctor
   ```

**The Environment is Missing Variables**
1. Check that `.env` is present in the root folder.
2. Run `npm run ops:verify` to run pre-flight checks validating your configuration and tokens.

## Common Operations

- **Restart without Updating:**
  ```bash
  npm run ops:restart
  ```
- **Stop entirely:**
  ```bash
  npm run ops:stop
  ```
- **Start (if stopped):**
  ```bash
  npm run ops:start
  ```
- **Test a command before running (Dry Run):**
  Most scripts support `--dry-run` to print the exact provider-specific shell command it *would* run without actually doing it.
  ```bash
  bash ops/restart.sh --dry-run
  ```
