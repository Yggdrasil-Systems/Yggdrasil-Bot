# PM2 Provider

PM2 is a robust Node.js process manager. The `pm2` provider manages World Tree as a daemonized Node process, relying on `ecosystem.config.cjs` for configuration limits.

## Capabilities
- Graceful reloading
- Node-specific memory limits and auto-restarts
- Out-of-the-box cluster mode (if configured)
- Persistent states via `pm2 save`

## Usage
To use PM2, ensure `OPS_PROVIDER=pm2` is set in `ops/lib/config.sh` (or run `npm run ops:switch pm2`).

## Installation
The `npm run ops:deploy` script handles installation automatically by invoking the `service_install` hook. 
> [!NOTE]
> PM2 requires you to run `pm2 startup` manually once on a fresh server to ensure it boots on OS restart. The `service_install` hook will remind you of this.

## Logs
Logs are managed by PM2 and written to `logs/`. 
You can view them via the abstraction:
```bash
npm run ops:logs
```
Or directly:
```bash
pm2 logs world-tree
```
