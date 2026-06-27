# World Tree — Engineering Roadmap (Post-Audit)

> This is the roadmap baseline, not a claim that every item is still pending. Completed work should be verified against `README.md`, `docs/PHASE_2_VERIFICATION.md`, `DEEP_AUDIT_REPORT.md`, and `DEEP_FOUNDATION_REPORT.md`.

**Technical Lead / Principal Architect / Engineering Manager**  
**Date:** 2026-05-30  
**Scope:** 6-month execution plan addressing all audit findings + Activity Role feature  
**Philosophy:** Self-hosted, lightweight, monolith, intentional, maintainable  

---

## 1. Executive Roadmap

This roadmap transforms the architecture audit into a month-by-month execution plan. It is **not** a rewrite. It is **surgical improvement** while shipping features.

**Core Constraint:** The Spotify Activity Role feature ships FIRST (Phase 0). It is built generically so future activity roles (streaming, gaming, voice) require zero architectural redesign.

**Primary Sequence:**

```
Phase 0: Feature Foundation (Activity Roles)
Phase 1: Operational Backbone (logger, health, rate limiting)
Phase 2: Structural Cleanup (god file, global state, AppContext)
Phase 3: Data & Resource Hardening (migrations, caches, processes)
Phase 4: Platform Expansion (dashboard write APIs, metrics, audit)
Phase 5: Engineering Maturity (TypeScript, CI/CD, docs)
```

**Time Horizon:** ~5–6 months at a solo-developer pace (~10–15 hours/week).

**Success Criteria:** After Phase 3, the codebase should be able to support new community features without architectural fear. After Phase 4, the platform is actually a platform. After Phase 5, it is a professional-grade project.

---

## 2. Phase-by-Phase Plan

---

### Phase 0: Activity Role Foundation

**Goal:** Implement the Spotify auto-role feature. Design it generically so future activity types (streaming, gaming, voice) slot in without redesign.

**Why it exists:** User-requested feature. It also stress-tests the event architecture (presence handling) and proves the generic activity pattern works before we refactor the architecture.

**Dependencies:** None. Builds on existing patterns.

**Estimated Complexity:** Medium (~20–30 hours)

**Risk Level:** Low–Medium. Risk is contained if we keep it clean and don't refactor existing code while implementing it.

**Files Likely Affected:**
- `src/events/presenceUpdate.js` (NEW)
- `src/services/activityRoleService.js` (NEW)
- `src/database/mongo/models/GuildSettings.js` (MODIFY — add `activityRoles` nested schema)
- `src/database/mongo/repositories/settingsRepository.js` (MODIFY — add activity role CRUD methods)
- `src/commands/setup/activityrole.js` (NEW — slash commands: `/activityrole spotify set`, `/activityrole spotify remove`, `/activityrole list`)
- `src/utils/constants.js` (MODIFY — add `DEFAULT_ACTIVITY_ROLES`)
- `src/api/routes/v1/guilds/settings.route.js` (MODIFY — expose activity role config in read endpoints)
- `test/activityRoleService.test.js` (NEW)
- `test/presenceUpdate.test.js` (NEW)

**Architectural Impact:**
- Introduces the first `presenceUpdate` event handler
- Extends GuildSettings with a nested `activityRoles` configuration object
- Establishes the `ActivityRoleService` pattern that future activity types will follow
- Tests the service → repository → schema pipeline end-to-end without touching existing architecture

**Expected Outcome:**
- Bot automatically grants a configured role when a user starts listening to Spotify
- Bot automatically removes the role when the user stops
- Configuration is per-guild via slash commands and persists in MongoDB
- Schema supports `spotify`, `streaming`, `gaming`, `voice` activity types without schema changes
- Full test coverage with mocked presences and roles

**Design Notes for Future Activity Types:**
```js
// activityRoleService.js
const ACTIVITY_MATCHERS = {
  spotify: (activity) => activity.name === 'Spotify' && activity.type === ActivityType.Listening,
  streaming: (activity) => activity.type === ActivityType.Streaming,
  gaming: (activity) => activity.type === ActivityType.Playing,
  // voice is handled by voiceStateUpdate, not presenceUpdate, but the schema is the same
};
```
Each activity type maps to a `{ enabled, roleId }` config in the guild settings. The service iterates configured types and applies the matcher.

**AI Tool Allocation:**
- **Gemini:** Design the generic activity role architecture and schema design (large context needed to understand existing codebase patterns)
- **Claude Opus:** Implement the `presenceUpdate` handler with edge case handling (missing roles, bot permission checks, role hierarchy)
- **Codex:** Generate boilerplate commands, repository methods, and tests
- **Manual:** Review the generic extensibility, verify the presence matching logic against real Discord data

---

### Phase 1: Operational Backbone

**Goal:** Make the bot observable, debuggable, and safe in production.

**Why it exists:** The current logger is a `console.log` wrapper. The health endpoint is a dummy. PM2 has no log rotation. You are flying blind in production. This must be fixed before any risky refactor.

**Dependencies:** None. Phase 0 can be done in parallel, but Phase 1 should begin immediately after Phase 0 ships.

**Estimated Complexity:** Low–Medium (~15–20 hours)

**Risk Level:** Low. These are additive changes with no architectural restructure.

**Files Likely Affected:**
- `src/utils/logger.js` (REPLACE — structured logger)
- `src/utils/loggerFactory.js` (NEW — child logger creation)
- `src/index.js` (MODIFY — use structured logger)
- `src/api/server.js` (MODIFY — add rate limiting plugin registration)
- `src/api/plugins/rateLimitPlugin.js` (NEW — rate limiting)
- `src/api/routes/v1/health/health.route.js` (MODIFY — add gateway + DB health checks)
- `src/api/plugins/auditLogPlugin.js` (NEW — request logging middleware)
- `ecosystem.config.cjs` (MODIFY — log rotation, max restarts, restart delay)
- All files importing `logger` (MODIFY — update to new API)
- `test/logger.test.js` (REPLACE)
- `test/health.test.js` (NEW)

**Architectural Impact:**
- Logger becomes a real infrastructure concern with levels, JSON output, and correlation IDs
- Health endpoint exposes: Discord gateway status, WebSocket ping, MongoDB connection state, uptime, memory
- Rate limiting protects auth endpoints and guild APIs
- PM2 config becomes production-ready
- All requests are logged with method, path, user ID, and response time

**Expected Outcome:**
- Production logs are structured JSON with `level`, `time`, `msg`, `correlationId`, `component`
- `logger.child({ component: 'moderationService' })` is used throughout
- Health endpoint returns `200` with `{ status: 'ok', gateway: 'connected', db: 'connected', ping: 42 }`
- Auth endpoints are rate-limited to 10 requests/minute per IP
- PM2 rotates logs at 100MB and restarts on >500MB memory
- `request.log.warn` is used for 4xx errors; `request.log.error` for 5xx

**AI Tool Allocation:**
- **Gemini:** Plan the logger migration strategy across all files (which files need `child` loggers, which need correlation IDs)
- **Claude Opus:** Implement the logger, health checks, and rate limiting (precision and security matter here)
- **Codex:** Update all existing `logger.info` / `logger.error` calls to use the new API
- **Manual:** Verify PM2 log rotation and test health endpoint against a real Discord disconnect

---

### Phase 2: Structural Architecture Cleanup

**Goal:** Decompose the `commandRouter.js` god file, eliminate the global mutable player, create an AppContext, and extract music channel logic.

**Why it exists:** `commandRouter.js` is a 386-line architectural tumor. It blocks every new UI feature. The global `player` export breaks test isolation. Monkey-patching the Discord client is unmaintainable. This is the most important long-term fix.

**Dependencies:** Phase 1 (operational backbone provides logging and health checks to observe the refactor safely).

**Estimated Complexity:** High (~40–50 hours). This is **underestimated** in most plans. It is harder than it looks because the god file has implicit dependencies between music UI state, button handlers, and embed builders.

**Risk Level:** High. This touches the core interaction layer. A mistake here breaks every button, menu, and music control in the bot.

**Files Likely Affected:**
- `src/middleware/commandRouter.js` (DELETE — decomposed)
- `src/interactions/` (NEW DIRECTORY)
  - `registry.js` (NEW — handler registration)
  - `handlers/musicPlaybackHandler.js` (NEW — pause, resume, skip, previous, stop)
  - `handlers/musicSettingsHandler.js` (NEW — loop modes, autoplay, volume)
  - `handlers/filterHandler.js` (NEW — bassboost, nightcore, vaporwave, 8D, clear)
  - `handlers/queueHandler.js` (NEW — queue display, clear)
  - `handlers/helpHandler.js` (NEW — help category select)
  - `handlers/pingHandler.js` (NEW — ping refresh)
  - `handlers/searchHandler.js` (NEW — search result selection)
- `src/middleware/interactionRouter.js` (NEW — small dispatcher that delegates to registry)
- `src/services/musicService.js` (MODIFY — remove `export let player = null`)
- `src/services/playerService.js` (NEW — guild-scoped player lookup)
- `src/middleware/messageCommandRouter.js` (MODIFY — extract music channel logic)
- `src/services/musicChannelService.js` (NEW — music channel auto-play behavior)
- `src/context/appContext.js` (NEW — dependency container)
- `src/bootstrap.js` (MODIFY — build AppContext instead of monkey-patching client)
- `src/client.js` (MODIFY — remove `client.commands` monkey-patch if possible)
- All command files (MODIFY — accept `context` parameter instead of `interaction.client` state)
- All event files (MODIFY — receive `context` instead of relying on `client.settingsService`)
- `test/interactionRouter.test.js` (NEW)
- `test/appContext.test.js` (NEW)
- All existing tests (MODIFY — update mocks)

**Architectural Impact:**
- Interaction routing becomes a **registry pattern**: each handler registers itself with a `customId` prefix. Adding a new button type requires adding a new handler file and registering it — no touching the router.
- Music player becomes **guild-scoped and injectable**: `playerService.get(guildId)` replaces `player.nodes.get(guildId)`. No global mutable state.
- Discord client is **no longer a DI container**: an `AppContext` object holds `settingsService`, `noPrefixService`, `moderationService`, `activityRoleService`, `config`, and `logger`. Commands and events receive `context`.
- Music channel auto-play is a **dedicated service** with proper tests, not a `setTimeout` hack in the message router.

**Expected Outcome:**
- `interactionRouter.js` is under 50 lines. It delegates by prefix to the registry.
- New interaction types can be added in 1 file + 1 registration line.
- Zero global mutable exports in the music subsystem.
- `client` object is clean — no `client.settingsService`, `client.runtimeConfig`, or `client.noPrefixService`.
- All tests pass without importing global state.

**AI Tool Allocation:**
- **Gemini:** Decompose `commandRouter.js`. This requires understanding the entire file and its cross-file dependencies. Large context is essential.
- **Claude Opus:** Implement the `AppContext` and registry pattern (needs careful design to avoid breaking the test suite)
- **Codex:** Extract individual handlers once Gemini designs the decomposition plan
- **Manual:** Make judgment calls about which handlers belong together vs. separate. Review ALL tests. This phase requires human oversight on every PR.

---

### Phase 3: Data & Resource Hardening

**Goal:** Prevent data corruption, resource leaks, and memory exhaustion.

**Why it exists:** No database migrations mean schema changes are risky. Unbounded caches will crash the process as guild count grows. yt-dlp subprocesses can leak. Automod state grows forever in memory.

**Dependencies:** Phase 2 (AppContext makes cache and migration integration cleaner; architecture is stable).

**Estimated Complexity:** Medium–High (~25–35 hours). The first migration is always painful.

**Risk Level:** Medium. Migrations touch production data. Caches affect performance. Wrong migration = data loss.

**Files Likely Affected:**
- `scripts/migrate.js` (NEW — migration runner)
- `src/database/mongo/migrations/` (NEW DIRECTORY)
  - `001_init.js` (NEW — baseline migration, no-op for existing data)
  - `002_add_activity_roles.js` (NEW — ensures activityRoles field exists)
- `src/database/mongo/connection.js` (MODIFY — run migrations on connect)
- `src/database/mongo/migrationModel.js` (NEW — tracks migration state)
- `src/utils/lruCache.js` (NEW — simple LRU implementation)
- `src/services/settingsService.js` (MODIFY — replace `Map` with `LRUCache`)
- `src/services/noPrefixService.js` (MODIFY — replace `Map` with `LRUCache`)
- `src/services/automod/automodState.js` (MODIFY — add TTL sweep, max size)
- `src/services/musicService.js` (MODIFY — process pool / safety improvements for yt-dlp)
- `src/database/mongo/connection.js` (MODIFY — add circuit breaker / retry logic)
- `test/migrations.test.js` (NEW)
- `test/lruCache.test.js` (NEW)
- `test/automodState.test.js` (NEW)

**Architectural Impact:**
- Database schema is **versioned and migratable**. Every schema change is a numbered migration with `up` and `down`.
- All in-memory caches have **bounded size** (e.g., 1,000 guilds for settings, 10,000 users for no-prefix) and **LRU eviction**.
- Automod state has **TTL cleanup** — old entries are pruned periodically.
- Music subprocesses have **resource limits** — max concurrent processes, safety timers, and explicit cleanup on queue deletion.
- MongoDB connection has **retry logic** and a **degraded mode** (return cached data if DB is briefly unreachable).

**Expected Outcome:**
- `node scripts/migrate.js` runs all pending migrations and records them in a `migrations` collection.
- Settings cache never exceeds 1,000 entries. NoPrefix cache never exceeds 10,000.
- Automod state Map never exceeds 50,000 entries and prunes entries older than 5 minutes.
- No more than 5 concurrent yt-dlp processes. Orphaned processes are killed within 60 seconds of queue deletion.
- MongoDB blip causes a 5-second retry, not a crash.

**AI Tool Allocation:**
- **Gemini:** Design the migration system architecture and cache sizing strategy
- **Claude Opus:** Implement migrations (data safety is critical) and MongoDB circuit breaker
- **Codex:** Generate LRU cache implementation, migration tests, and cache tests
- **Manual:** Test the first migration against a production-like database backup. Verify cache eviction under load.

---

### Phase 4: Platform Expansion

**Goal:** Make the dashboard and API a true management platform.

**Why it exists:** The API is currently read-only. The dashboard cannot manage settings or cases. The API has no audit trail. Without write endpoints, the "platform" narrative is just a read-only viewer.

**Dependencies:** Phase 3 (migrations provide schema stability; caches and health checks provide operational confidence).

**Estimated Complexity:** Medium (~30–40 hours)

**Risk Level:** Medium. Write APIs are security-sensitive. Every write endpoint needs permission checks, audit logging, and input validation.

**Files Likely Affected:**
- `src/api/routes/v1/guilds/settings.route.js` (MODIFY — add PATCH endpoints)
- `src/api/routes/v1/guilds/cases.route.js` (MODIFY — add POST resolve/delete, GET by ID)
- `src/api/routes/v1/guilds/activityroles.route.js` (NEW — activity role config endpoints)
- `src/api/middleware/auditLog.js` (NEW — logs all API mutations)
- `src/api/middleware/guildPermissionGuard.js` (NEW — verifies user is admin/moderator of the guild)
- `src/services/auditLogService.js` (NEW — persists audit trail)
- `src/database/mongo/models/AuditLog.js` (NEW — audit log schema)
- `src/database/mongo/repositories/auditLogRepository.js` (NEW)
- `src/api/routes/v1/admin/` (NEW — admin endpoints: global stats, user management)
- `src/monitoring/metrics.js` (NEW — Prometheus-compatible metrics)
- `src/api/routes/v1/metrics.route.js` (NEW — metrics endpoint)
- `test/auditLog.test.js` (NEW)
- `test/guildPermissionGuard.test.js` (NEW)
- `test/settingsWriteApi.test.js` (NEW)

**Architectural Impact:**
- API becomes a **true management surface**: dashboard can modify settings, resolve cases, and manage activity roles.
- Every mutation is **audited**: who changed what, when, and from which IP.
- Guild-scoped endpoints verify the caller has Discord permissions in that guild (not just a valid session).
- Metrics endpoint exposes: command count, API latency, DB query time, cache hit rate, music queue count.
- Admin endpoints provide global visibility for the bot owner.

**Expected Outcome:**
- `PATCH /v1/guilds/:guildId/settings` updates automod thresholds, mod log channel, etc.
- `POST /v1/guilds/:guildId/cases/:caseId/resolve` resolves a moderation case via API.
- `PATCH /v1/guilds/:guildId/activityroles/spotify` configures the Spotify role.
- Audit log collection records every mutation with `userId`, `guildId`, `action`, `oldValue`, `newValue`, `timestamp`.
- Metrics endpoint returns Prometheus-compatible metrics.
- Dashboard can now manage the bot, not just view it.

**AI Tool Allocation:**
- **Gemini:** Design the API expansion and audit log architecture (permission model, endpoint structure)
- **Claude Opus:** Implement guild permission guards and audit logging (security-critical)
- **Codex:** Generate write endpoints, tests, and metrics boilerplate
- **Manual:** Review API security with real Discord OAuth sessions. Test dashboard integration end-to-end.

---

### Phase 5: Engineering Maturity

**Goal:** Long-term code quality, type safety, and automated deployment.

**Why it exists:** TypeScript prevents runtime bugs caused by Discord.js API changes. CI/CD prevents bad deploys. Documentation helps onboarding. This is a long-term velocity investment.

**Dependencies:** Phase 4 (stable platform codebase worth investing in).

**Estimated Complexity:** High (~50+ hours for full migration, but can be gradual).

**Risk Level:** Low–Medium. TypeScript migration is tedious but not risky if done gradually. CI/CD is low-risk additive work.

**Files Likely Affected:**
- `tsconfig.json` (NEW)
- `package.json` (MODIFY — add `typescript`, `tsx`, `@types/*` dev dependencies)
- All `src/**/*.js` → `src/**/*.ts` (GRADUAL — core modules first, commands last)
- `.github/workflows/ci.yml` (NEW — run tests on PR)
- `.github/workflows/deploy.yml` (NEW — deploy on merge to master)
- `docs/api.md` (NEW — API documentation)
- `docs/architecture.md` (NEW — architecture overview)
- `docs/development.md` (NEW — local development guide)
- `test/` (MODIFY — use `tsx` or `ts-node` for test execution)
- `package.json` scripts (MODIFY — add `typecheck`, `build`, `lint`)

**Architectural Impact:**
- Type safety catches Discord.js API changes at compile time.
- CI pipeline runs `npm test`, `npm run typecheck`, and lint on every PR.
- Auto-deploy on merge to master (if self-hosted deploy script is ready).
- API documentation is generated from Zod schemas and route definitions.
- Developer onboarding is documented.

**Expected Outcome:**
- Core modules (`services/`, `repositories/`, `utils/`) are TypeScript.
- `npm run typecheck` passes with zero errors.
- GitHub Actions runs tests on every PR.
- Merging to master triggers a deploy to the PM2-managed host.
- API documentation is auto-generated and up-to-date.

**AI Tool Allocation:**
- **Gemini:** Plan TypeScript migration strategy (which files first, strictness level, gradual vs. big-bang)
- **Claude Opus:** Implement `tsconfig.json`, type definitions for core services, and strict typing for the API layer
- **Codex:** Auto-convert simple files and generate `@types` for Discord.js objects
- **Manual:** Strategic decisions about migration pace, CI/CD setup, and review of all typed interfaces

---

## 3. Dependency Graph

```text
Phase 0 (Activity Roles)
  │
  ▼
Phase 1 (Operational Backbone)
  │
  ▼
Phase 2 (Structural Cleanup)
  │
  ▼
Phase 3 (Data & Resource Hardening)
  │
  ▼
Phase 4 (Platform Expansion)
  │
  ▼
Phase 5 (Engineering Maturity)
```

**Phase 0 is independent.** It can start immediately.  
**Phase 1 is independent** but should follow Phase 0 so operational improvements are built on the latest code.  
**Phase 2 depends on Phase 1** because you need logging and health checks to observe a risky structural refactor.  
**Phase 3 depends on Phase 2** because AppContext makes cache and migration integration cleaner.  
**Phase 4 depends on Phase 3** because write APIs need a stable schema (migrations) and a healthy architecture.  
**Phase 5 depends on Phase 4** because TypeScript migration should happen on a stable, feature-complete codebase.

**Parallel Work:** Phase 1 could theoretically overlap with Phase 0 if the feature implementation is clean. But sequential is safer for a solo developer.

---

## 4. Priority Matrix

| Finding | Phase | Urgency | Effort | Value | Rationale |
|---------|-------|---------|--------|-------|-----------|
| commandRouter.js god file | 2 | 🔴 Critical | High | Very High | Blocks every UI feature. Gets worse with every new button. |
| Unbounded caches | 3 | 🔴 Critical | Low | High | Will crash production as guilds grow. |
| Primitive logger | 1 | 🔴 Critical | Low | High | You are blind in production. Debugging is impossible. |
| No API rate limiting | 1 | 🟠 High | Low | Medium | Security vulnerability. Easy fix. |
| No gateway health checks | 1 | 🟠 High | Low | High | Silent disconnects are invisible. |
| No migration strategy | 3 | 🟠 High | Medium | High | Every schema change is risky. |
| Global mutable player | 2 | 🟠 High | Medium | High | Breaks tests and predictability. |
| Client monkey-patching | 2 | 🟡 Medium | Medium | Medium | Technical debt that slows development. |
| yt-dlp process orphans | 3 | 🟡 Medium | Medium | Medium | Resource leak on long-running hosts. |
| Music channel logic coupling | 2 | 🟡 Medium | Medium | Medium | Hardcoded magic behavior. |
| Automod state lifecycle | 3 | 🟡 Medium | Low | Medium | Memory leak, but slow. |
| TypeScript | 5 | 🔵 Low | High | Medium | Nice to have, but not urgent. |
| CI/CD | 5 | 🔵 Low | Medium | Low | Solo project; manual deploy is fine. |
| Dashboard write APIs | 4 | 🟡 Medium | Medium | High | Required for platform value. |
| Metrics | 4 | 🔵 Low | Medium | Low | Helpful, but not critical at this scale. |
| Message queue | 5 | 🔵 Low | High | Low | Not needed until command volume is high. |

---

## 5. Risk Matrix

| Phase | Risk Level | Mitigation |
|-------|-----------|------------|
| Phase 0 (Activity Roles) | Low–Medium | Keep it clean. Don't refactor existing code while implementing. Use existing patterns. Extensive tests. |
| Phase 1 (Operational) | Low | Additive changes. No structural rewrites. Test logger output in a staging environment. |
| Phase 2 (Structural) | **High** | **Feature freeze during refactor.** Ship Phase 0 first. Use logging/health checks to observe. Write tests BEFORE refactoring each handler. Rollback plan: keep the old router file until all handlers are verified. |
| Phase 3 (Data Hardening) | Medium | Backup production DB before first migration. Test migrations on a copy. Run cache eviction tests under load. |
| Phase 4 (Platform) | Medium | Every write endpoint gets a security review. Test with real OAuth sessions. Audit all inputs. |
| Phase 5 (Maturity) | Low–Medium | TypeScript migration is gradual. Don't big-bang. CI/CD is additive. |

---

## 6. Recommended Implementation Order

**Sequence Minimizing Risk:**

1. **Phase 0 (Feature)** — Ship value immediately. No risky changes.
2. **Phase 1 (Operational)** — Add safety before touching architecture. Now you can see what breaks.
3. **Phase 2 (Structural)** — Refactor with observability. If something breaks, the logger and health checks tell you.
4. **Phase 3 (Data)** — Harden data layer on stable architecture.
5. **Phase 4 (Platform)** — Expand on solid foundation.
6. **Phase 5 (Maturity)** — Invest in long-term quality once the platform is stable.

**Why this order:** You ship the feature first (business value). Then you make the bot safe to operate (observability). Then you fix the architecture (risky, but now observable). Then you prevent data corruption. Then you expand. This is the safest path for a solo developer.

**Sequence Maximizing Learning:**

1. **Phase 0 (Feature)** — Learn the Discord presence API. Learn how to extend the schema cleanly.
2. **Phase 2 (Structural)** — Learn the true complexity of the interaction layer. Learn how to design a registry pattern.
3. **Phase 1 (Operational)** — Learn what production observability actually looks like for a bot.
4. **Phase 3 (Data)** — Learn migration discipline and resource management.
5. **Phase 4 (Platform)** — Learn API design for management surfaces.
6. **Phase 5 (Maturity)** — Learn TypeScript migration strategy and CI/CD.

**Why this order:** You learn the most by touching the real complexity early (feature + structural). But this is riskier. Only do this if you have time to recover from mistakes.

**Recommended:** Follow the **risk-minimizing sequence**. You are a solo developer. Recovery time is expensive.

---

## 7. AI Tool Allocation Per Phase

### Phase 0: Activity Roles
| Task | Tool | Why |
|------|------|-----|
| Generic architecture design | **Gemini** | Needs large context to understand existing patterns and design extensible system |
| Presence handler with edge cases | **Claude Opus** | Precision matters: role hierarchy, permissions, missing roles |
| Commands, repo methods, tests | **Codex** | Boilerplate and rapid iteration |
| Design review | **Manual** | Ensure future activity types fit without redesign |

### Phase 1: Operational Backbone
| Task | Tool | Why |
|------|------|-----|
| Logger migration plan | **Gemini** | Large context: every file uses logger |
| Logger, health checks, rate limiting | **Claude Opus** | Security and precision matter |
| Update logger calls across codebase | **Codex** | Mechanical refactoring |
| PM2 config & production testing | **Manual** | Needs real environment validation |

### Phase 2: Structural Cleanup
| Task | Tool | Why |
|------|------|-----|
| God file decomposition plan | **Gemini** | Must understand 386 lines + all dependencies |
| AppContext & registry design | **Claude Opus** | Careful API design needed |
| Extract individual handlers | **Codex** | Once plan is set, mechanical extraction |
| Test updates & review | **Manual** | Every test needs human verification |

### Phase 3: Data & Resource Hardening
| Task | Tool | Why |
|------|------|-----|
| Migration system design | **Gemini** | Architecture planning |
| Migration implementation | **Claude Opus** | Data safety is critical |
| LRU cache, tests | **Codex** | Standard implementation |
| Production DB testing | **Manual** | Must test against real data |

### Phase 4: Platform Expansion
| Task | Tool | Why |
|------|------|-----|
| API expansion architecture | **Gemini** | Endpoint design, permission model |
| Guild permission guards, audit log | **Claude Opus** | Security-critical |
| Write endpoints, metrics | **Codex** | Rapid endpoint generation |
| Security review & dashboard testing | **Manual** | Human judgment required |

### Phase 5: Engineering Maturity
| Task | Tool | Why |
|------|------|-----|
| TypeScript migration strategy | **Gemini** | Complex planning across entire codebase |
| tsconfig, core type definitions | **Claude Opus** | Precision matters for type safety |
| File conversion, tests | **Codex** | Mechanical conversion |
| CI/CD setup, docs | **Manual** | Needs human judgment on workflow design |

---

## 8. Expected Architecture State After Each Phase

### After Phase 0
- **New capability:** Spotify auto-role works
- **New pattern:** `ActivityRoleService` with generic matchers
- **Schema:** GuildSettings has `activityRoles` nested object
- **Events:** `presenceUpdate` is handled
- **Tests:** Activity role service has full coverage
- **Architecture:** Unchanged. Feature built on existing patterns.

### After Phase 1
- **New capability:** Structured JSON logging, health checks, rate limiting, log rotation
- **Pattern:** Logger is an infrastructure concern with child loggers and correlation IDs
- **Observability:** You can see gateway status, DB status, request logs, and errors
- **Safety:** Auth endpoints are rate-limited. PM2 restarts on memory threshold.
- **Architecture:** Unchanged. Additive improvements only.

### After Phase 2
- **New capability:** New interaction types can be added without touching the router
- **Pattern:** Registry-based interaction handlers, AppContext dependency container
- **State:** No global mutable exports. Discord client is clean.
- **Testability:** Music player is injectable. Tests don't need global mocks.
- **Architecture:** Transformed. This is the most significant structural change.

### After Phase 3
- **New capability:** Schema changes are safe. Caches are bounded. Subprocesses are managed.
- **Pattern:** Numbered migrations with `up`/`down`. LRU caches. TTL cleanup.
- **Reliability:** MongoDB blips don't crash the bot. Memory stays bounded.
- **Architecture:** Hardened. Data layer is production-ready.

### After Phase 4
- **New capability:** Dashboard can manage settings and cases. API has audit trail.
- **Pattern:** Write endpoints with guild permission guards. Audit logging.
- **Platform:** API is a true management surface, not just a read-only viewer.
- **Architecture:** Expanded. New endpoints follow existing patterns.

### After Phase 5
- **New capability:** Type safety. Auto-testing. Auto-deploy.
- **Pattern:** Core modules are TypeScript. CI/CD pipeline.
- **Velocity:** Catches API changes at compile time. Prevents bad deploys.
- **Architecture:** Professional-grade. Ready for long-term maintenance.

---

## 9. What Can Be Safely Postponed

### Postponable to Phase 5 (6+ months out)
- **TypeScript migration.** The project works fine as JavaScript. Do not let TypeScript block feature delivery.
- **CI/CD pipeline.** For a solo developer, manual testing and deploy is acceptable. Add CI/CD when you have contributors or when deploy frequency increases.
- **Full metrics (Prometheus/Grafana).** A simple `/metrics` endpoint with basic counters is enough for now. Full observability is overkill for a self-hosted bot.
- **Message queue.** You do not need a queue until the bot is in 100+ guilds with high command volume. The current synchronous flow is fine.
- **Containerization (Docker).** PM2 fork mode is the right deployment model for this project. Docker adds complexity with no benefit at this scale.

### Postponable to Phase 4 (4+ months out)
- **Dashboard write APIs.** The dashboard itself needs to exist first. Read-only API is acceptable until the dashboard frontend needs management features.
- **Advanced admin endpoints.** Global user management, bulk operations, etc. These are nice-to-have for a bot owner but not critical.
- **Voice activity role.** The presenceUpdate handler handles Spotify/streaming/gaming. Voice activity (voiceStateUpdate) is a different event. It can be added in Phase 4 using the same `activityRoleService` pattern.

### Postponable indefinitely (or until needed)
- **Redis.** MongoDB is sufficient for all data needs. In-memory LRU caches handle hot data. Redis is unnecessary overhead for a self-hosted monolith.
- **Microservices.** The monolith is correct. Do not split the bot into services.
- **Kubernetes.** PM2 is the right orchestrator for this scale.
- **GraphQL API.** REST with Zod is sufficient and simpler.
- **WebSocket dashboard.** HTTP polling is fine for a self-hosted dashboard. WebSockets add complexity.

---

## 10. Final Verdict

**This is a realistic, pragmatic roadmap.** It does not rewrite everything. It fixes the most dangerous issues first, ships valuable features early, and invests in long-term quality only after the foundation is solid.

**Phase 0 is the right starting point.** The Activity Role feature adds immediate value, tests the event architecture, and establishes a pattern for future features. It is low-risk if you resist the urge to refactor while implementing.

**Phase 1 must follow immediately.** You cannot safely refactor a bot you cannot observe. The logger and health checks are the cheapest, highest-impact operational improvements.

**Phase 2 is the hard part.** It will take longer than you think. Budget 40–50 hours. Do it in small PRs: extract one handler at a time, test it, merge it. Do not try to decompose the entire router in one sitting.

**Phase 3 is the safety net.** Migrations and caches prevent the silent failures that kill projects. Do not skip this.

**Phase 4 is where the platform becomes real.** Dashboard write APIs are the payoff for all the architectural work.

**Phase 5 is optional.** TypeScript and CI/CD are long-term investments. If you need to ship features, you can defer Phase 5 indefinitely.

**Recommended Pace:**
- **Month 1:** Phase 0 (Activity Roles)
- **Month 2:** Phase 1 (Operational Backbone)
- **Month 3–4:** Phase 2 (Structural Cleanup — do this slowly)
- **Month 5:** Phase 3 (Data Hardening)
- **Month 6:** Phase 4 (Platform Expansion)
- **Month 7+:** Phase 5 (Engineering Maturity — as time permits)

**The single most important rule:** Do not refactor and add features at the same time. Ship Phase 0. Then observe. Then fix. This is how you avoid breaking a working bot.

**Overall Assessment:** This roadmap is aggressive but achievable. It addresses every audit finding within 6 months while shipping new features. It preserves the project's philosophy of being small, intentional, and maintainable. It does not introduce unnecessary complexity. It is the right plan.

