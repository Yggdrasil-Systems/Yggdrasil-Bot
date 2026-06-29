# Repository Audit Report — WorldTree-Auth

Date: 2026-06-24

---

## Executive summary

- Files scanned: 182
- Tests: 201 passing, 0 failing
 - Critical findings: 0 (no committed secrets detected)
- Major positives: Fastify + Zod validation, strong env validation, structured logging with Pino and redaction, comprehensive test coverage for critical flows.

---

## High-severity issues (Immediate action required)

None identified. A local `.env` file exists in the workspace but is not tracked by git; ensure it is not accidentally committed and that secrets are rotated if they have been exposed elsewhere.

---

## Medium-severity issues

- **Subprocess usage for media extraction** (`src/services/musicService.js`): `yt-dlp-exec` is used and spawns external processes. Good lifecycle cleanup exists (safety timer, kill handlers) but risks remain:
  - Untrusted input may be used to form `ytsearch1:` queries — sanitize/validate search strings.
  - Long-running/excess resource use could be abused; consider worker isolation (separate process/container) and tighter resource limits.

- **Warnings during tests about discord client instance / intents**:
  - Tests show runtime warnings: `InvalidClientInstance` and `InvalidIntentsBitField` (missing `GuildVoiceStates`). The production client creation (`src/client.js` + `src/config/discord.js`) includes the required intents; warnings likely come from test mocks or multiple discord.js instances.
  - Action: ensure tests create Client using same discord.js version and include required intents when needed; verify there are no duplicate discord.js installations.

- **Tooling gaps**:
  - No linter/formatter (`eslint`/`prettier`) configured.
  - No CI workflow to run tests and `npm audit` on PRs.
  - Dev dependency set is minimal; add tooling for static analysis and security checks.

---

## Low-severity / informational

- `src/config/env.js`: strong validation (required profiles, origin parsing, session secret minimum length). Good.
- `src/utils/logger.js`: Pino-based logger with redaction, child binding support, and pretty-print in non-production. Good.
- `src/api/server.js`: Fastify server uses Zod validators, rate-limiting and CORS restricted to `dashboardOrigin`. Session and OAuth plugin conditional registration is correct.
- No occurrences of `eval`, `new Function`, or other dynamic-code constructs found across JS/TS files.
- No `console.log` usage in source code (console references appear only in documentation/architectural notes).

---

## File-level notes (selected, actionable)

- **[package.json](package.json)**
  - **What:** Node >= 20, scripts: `start`, `dev`, `register:commands`, `test`.
  - **Notes:** Production dependencies look reasonable for a Discord bot. Dev tooling (linting, coverage, CI) is missing.
  - **Recommendation:** Add `eslint`, `prettier`, `c8`/`nyc` for coverage, and a CI workflow.

- **[.env](.env)**
  - **What:** Present in repo root and contains sensitive credentials (Discord token). This file must be removed and the token rotated.
  - **Recommendation:** Rotate token immediately. Purge `.env` from history if repository has been shared.

- **[.gitignore](.gitignore)**
  - **What:** `.env` is already listed (good). The presence of a committed `.env` implies it was committed before being ignored.
  - **Recommendation:** Use `git rm --cached .env` and follow history-clean steps below.

- **[src/client.js](src/client.js)** + **[src/config/discord.js](src/config/discord.js)**
  - **What:** `createClient()` uses intents including `GuildVoiceStates` — required for voice features. `GuildPresences` is excluded by default (privileged intent) and must be manually added to `CLIENT_INTENTS` for activity roles.
  - **Notes:** Warnings in tests likely indicate a mismatch in test stubs or multiple discord.js copies. `npm ls discord.js` shows one installed copy, so investigate test mocks.
  - **Recommendation:** Ensure test fixtures create clients with the same intents or stub server-side pieces instead of constructing incompatible client objects.

- **[src/services/musicService.js](src/services/musicService.js)**
  - **What:** Uses `yt-dlp-exec` to create stream subprocesses and includes a safety timer + kill handler.
  - **Risk:** Untrusted input could affect command-line parsing/behavior; process may be long-running.
  - **Recommendation:** Sanitize user-supplied metadata used in `ytsearch1:` queries, consider running extraction in isolated worker or container, and set stricter time/resource limits.

- **[src/config/env.js](src/config/env.js)**
  - **What:** Centralized environment profile validation, origin parsing, CSV parsing, session secret length enforcement.
  - **Strengths:** Prevents many misconfigurations and enforces secure session secrets.

- **[src/utils/logger.js](src/utils/logger.js)**
  - **What:** Pino-based adapter with message redaction and structured `details` field.
  - **Strengths:** Implements redaction patterns and transport for pretty-printing in dev.
  - **Recommendation:** Configure production transport and log rotation (external agent or pino destination), and ensure correlation IDs are added to request log context.

- **Tests**
  - 201 tests passing — excellent coverage on auth, API routes, services, and music/automod logic. Use test coverage reporting to identify untested areas.

---

## Recommended remediation commands (safe, step-by-step)

1) Rotate exposed credentials (Discord bot token) immediately via the Discord Developer Portal.

2) Remove the committed `.env` file and push a safe commit:

```bash
git rm --cached .env
git commit -m "chore(secrets): remove committed .env"
git push origin <branch>
```

3) If the repository has been public or shared and you need to scrub history, use either `git filter-repo` or BFG. Example with BFG (read BFG docs first):

```bash
# Install BFG and run (example):
bfg --delete-files .env
# Then clean up and force-push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

4) Run dependency audit and triage advisories:

```bash
npm audit --json > npm-audit.json
npm outdated
```

5) Add linting, formatting, and CI:

```bash
npm i -D eslint prettier
npx eslint --init
# Create a GitHub Actions workflow to run `npm test` and `npm audit --audit-level=moderate` on PRs
```

6) Add coverage reporting:

```bash
npm i -D c8
# Run tests with coverage
npx c8 --reporter=text npm test
```

---

## Suggested next steps I can take for you

- Run `npm audit` now and produce a vulnerability remediation plan.
- Add an `eslint` config + `lint` script and run it across the codebase; auto-fix simple issues.
- Produce a small GitHub Actions workflow (`.github/workflows/ci.yml`) that runs tests and `npm audit` on PRs.
- Help remove `.env` from Git history (I can prepare the BFG/git-filter-repo commands and an explanation of consequences).

---

If you want the full per-file checklist (every file enumerated with an automatic "OK / review" label), I can generate that as a follow-up and save as `AUDIT_FILES.csv` or a more verbose markdown table — let me know.

