# Recovery and Rollbacks

If a bad deployment occurs, World Tree can be rolled back to a previous safe state quickly using Git. The operational SDK automatically bridges the gap between Git logic and the active provider's restart mechanism.

## Rolling Back

1. **Find a safe target**: Look for the previous Git commit hash or stable tag.
   ```bash
   git log --oneline
   ```
2. **Execute Rollback**:
   ```bash
   npm run ops:rollback <commit-hash-or-tag>
   ```

**What it does:**
- Validates the working tree is clean.
- Checks out the target commit/tag exactly.
- Installs the exact NPM dependencies present at that time.
- Restarts the application gracefully via the active provider plugin.

> [!WARNING]
> Rolling back puts your repository in a **Detached HEAD** state. While in this state, do not write new code or make commits directly on the server.

## Returning to Normal Operations
After you have investigated and pushed fixes to the main branch remotely, you can exit the detached HEAD state by returning to `master`:

```bash
git checkout master
npm run ops:update
```
