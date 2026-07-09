# Backups

The operational layer automatically creates point-in-time configuration backups prior to every automated update. This ensures that sensitive environment variables and deployment parameters are never accidentally lost during a botched release.

## Location
Backups are archived locally on the server at `<repo-root>/backups/`. They follow the naming format `world-tree-backup-YYYY-MM-DD_HH-MM-SS.tar.gz`.

## Manual Backups
To create an on-demand backup:
```bash
bash ops/backup.sh
```

## Restoring Backups
If an operational asset (such as `.env` or `ecosystem.config.cjs`) is deleted or corrupted, you can restore from the archive.

1. **Locate the desired backup archive:**
   ```bash
   ls -la backups/
   ```
2. **Execute Restore:**
   ```bash
   bash ops/restore.sh backups/world-tree-backup-<timestamp>.tar.gz
   ```

> [!WARNING]
> Running the restore command will overwrite the current working directory's `.env`, `ecosystem.config.cjs`, `package.json`, and `ops/` files with the contents of the archive.
