# Updating

This document covers the routine process for updating World Tree with new code releases on the production server.

## Overview

The update process is completely automated and agnostic to the underlying service provider. It prevents unexpected merge conflicts, automatically captures configuration backups, installs necessary packages, and delegates the graceful reload process to the active provider (e.g., `systemd` or `pm2`).

## How to Update

1. **SSH into the Oracle Cloud instance** and navigate to the repository root.

2. **Run the Update Script**:
   ```bash
   npm run ops:update
   ```

   **What it does:**
   - Validates that your working directory is entirely clean.
   - Runs pre-flight verification via the provider SDK.
   - Archives configuration into `backups/`.
   - Executes a `git fetch` and `git pull --ff-only`.
   - Installs NPM dependencies cleanly (`npm ci`).
   - Runs linters and tests.
   - Registers new Discord slash commands.
   - Gracefully reloads the background service via the active provider.
   - Executes a post-deployment health check.

## Troubleshooting

- **"Working tree is dirty" Error**: You have local, uncommitted changes. You must either commit them, stash them manually, or discard them (`git reset --hard`) before updating.
- **"Not possible to fast-forward" Error**: The remote repository has diverged from your local production branch. Resolve the Git history manually.
- **Diagnostic Dashboard**: Run `npm run ops:info` to see exactly which provider is active, what the current uptime is, and whether the service successfully reloaded.
