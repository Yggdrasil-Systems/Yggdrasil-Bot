# Monitoring

Monitoring the state of the application on Oracle Cloud is handled primarily by PM2 and our operational scripts.

## The Holistic Dashboard

The fastest way to view the system's runtime state is:
```bash
npm run ops:status
```
This displays the running PM2 instances, current uptime, restart counts, active Git branches, memory utilization, and CPU load.

## Automated Health Checks

```bash
npm run ops:health
```
This script acts as a pass/fail indicator. It checks PM2 status, available server disk space and RAM, checks for the presence of the log directory, and alerts on excessive restart loops.

## Viewing Live Logs

World Tree integrates seamlessly with PM2's native log rotation and trailing output. The `ops/logs.sh` script wraps this cleanly.

**View all logs (default):**
```bash
npm run ops:logs
```

**Filter to only Application Output Logs:**
```bash
bash ops/logs.sh out
```

**Filter to only Application Error Logs:**
```bash
bash ops/logs.sh error
```

**View underlying PM2 system logs:**
```bash
bash ops/logs.sh pm2
```
