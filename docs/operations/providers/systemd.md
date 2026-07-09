# Systemd Provider

Systemd is the default native service manager for Oracle Cloud Linux environments. The `systemd` provider manages World Tree as a background daemon natively at the OS level.

## Capabilities
- Service installation (starts on boot)
- Native log rotation via `journalctl`
- Auto-restarting on failure
- Reloading the process without downtime

## Usage
To use Systemd, ensure `OPS_PROVIDER=systemd` is set in `ops/lib/config.sh` (or run `npm run ops:switch systemd`).

## Installation
The `npm run ops:deploy` script handles installation automatically by invoking the `service_install` hook. Under the hood, this translates to:
```bash
sudo systemctl enable world-tree.service
sudo systemctl start world-tree.service
```

## Logs
Logs are routed natively to `journald`. 
You can view them via the abstraction:
```bash
npm run ops:logs
```
Or directly:
```bash
journalctl -u world-tree.service -f
```
