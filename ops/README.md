# Operational Framework SDK

This folder contains a provider-agnostic framework to govern deployments, updates, monitoring, and backups for World Tree.

Unlike traditional deployment scripts that hardcode `pm2` or `systemctl` commands, these scripts rely on a **Provider Plugin Architecture**. The core scripts (`update.sh`, `deploy.sh`) only care *what* to do (start, stop, check status), while the underlying `providers/` SDK handles *how* it's done.

## The Ops Scripts

You can run these scripts natively via `bash ops/SCRIPT.sh`, or utilize the `npm run ops:*` wrappers in `package.json`.

| Script   | Purpose               | NPM Wrapper            |
| -------- | --------------------- | -----------------------|
| info     | Master dashboard      | `npm run ops:info`     |
| deploy   | First deployment      | `npm run ops:deploy`   |
| update   | Normal updates        | `npm run ops:update`   |
| switch   | Change provider       | `npm run ops:switch`   |
| start    | Start service         | `npm run ops:start`    |
| stop     | Stop service          | `npm run ops:stop`     |
| restart  | Restart service       |                        |
| backup   | Create backup         |                        |
| restore  | Restore backup        |                        |
| rollback | Roll back Git version |                        |
| verify   | Verify environment    | `npm run ops:verify`   |
| doctor   | Diagnose problems     |                        |
| status   | Show basic status     | `npm run ops:status`   |
| logs     | View logs             | `npm run ops:logs`     |
| health   | Health checks         | `npm run ops:health`   |

## Switching Providers

By default, World Tree uses `systemd` to manage the background process natively on Linux.

To dynamically switch your process manager to PM2:
```bash
npm run ops:switch pm2
```
This updates `ops/lib/config.sh` instantly. Subsequent calls to `npm run ops:update` will now use PM2 instead.

## Adding a Provider

If World Tree migrates to Docker or Kubernetes, adding a new provider is trivial:
1. `cp ops/lib/providers/template.sh ops/lib/providers/docker.sh`
2. Implement the standard lifecycle and health check shell hooks.
3. Switch to it (`npm run ops:switch docker`).

All operational scripts (deploy, backup, update) will instantly inherit Docker compatibility without a single line of code changing in the core scripts!
