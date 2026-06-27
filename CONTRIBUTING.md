# Contributing

## Project Shape

World Tree is a modular monolith:

- `src/commands` for Discord entry points
- `src/services` for business logic
- `src/database` for persistence boundaries
- `src/api` for Fastify routes and auth/session infrastructure
- `src/interactions` for component/select-menu handlers

Commands should stay thin. Services own behavior. Repositories isolate storage.

## Local Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` values into your local `.env`.
4. Register slash commands with `npm run register:commands` when command metadata changes.
5. Start the bot with `npm run dev` or `npm start`.

## Before Opening a Pull Request

1. Keep changes focused.
2. Update docs when behavior changes.
3. Add or update tests when code changes.
4. Run `npm test`.

## Coding Standards

- prefer existing repo patterns over new abstractions
- keep Discord handlers thin
- route persistence through services/repositories
- do not introduce JWTs, Redis session stores, or architecture rewrites without an approved design change
- preserve the self-hosted, low-overhead philosophy

## Commit Scope

Small commits are preferred. Avoid mixing unrelated cleanup with feature work.

## Documentation Expectations

If you change:

- commands: update README/help/docs as needed
- auth/session behavior: update API/auth docs
- deployment/runtime requirements: update `.env.example`, README, and deployment docs

## Questions

Use GitHub Issues for bug reports and improvement proposals. Sensitive security reports belong in the channels described in [SECURITY.md](./SECURITY.md).
