# Developer Guide

## Purpose

World Tree is a self-hosted Discord bot and backend platform living in one Node.js process. The repository favors clear service boundaries over framework-heavy abstractions.

## Working Rules

- commands stay thin
- services own behavior
- repositories isolate MongoDB access
- Fastify plugins own API infrastructure concerns
- shared runtime dependencies move through `AppContext`

## Main Runtime Flow

1. `src/index.js` wires shutdown handling.
2. `src/bootstrap.js` creates `AppContext`, connects MongoDB, loads commands/events, initializes the player, logs in the client, and conditionally starts the API server.
3. Discord events attach `appContext` to message/interaction objects before routing.

## Safe Change Areas

- command behavior changes: `src/commands`, `src/services`, matching tests
- API behavior changes: `src/api`, `src/config/env.js`, matching tests
- interaction behavior changes: `src/interactions`, `src/middleware/commandRouter.js`, matching tests

## High-Caution Areas

- auth/session plugins
- permission and no-prefix trust boundaries
- music external-process integration
- repository-layer schema changes
