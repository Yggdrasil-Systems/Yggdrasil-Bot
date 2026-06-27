# World Tree Dashboard Foundation

This directory is still a dashboard foundation, not a shipped frontend application.

What is already implemented in the main repository:

- Fastify API server
- Discord OAuth2 + PKCE
- encrypted cookie sessions
- authenticated `/v1/auth/*` routes
- read-only guild routes for settings, cases, and stats

What is intentionally not implemented here yet:

- a browser dashboard runtime
- guild-picker UX
- settings write forms
- Vite/React build pipeline
- production hosting for a real dashboard frontend

This folder remains the contract and planning boundary for a later UI phase.

## Current Contents

```text
dashboard/
├── API.md
├── README.md
├── WIREFRAMES.md
└── contracts/
    ├── automod-settings.schema.json
    ├── guild-settings.schema.json
    └── moderation-case.schema.json
```

## Intended First Dashboard Scope

- View guild settings
- Update mod-log channel
- Manage trusted admin roles
- View and update automod settings
- View moderation cases
- Resolve or soft-delete moderation cases
- Read command documentation

## Architecture Boundary

The dashboard should not import bot command files directly.

Preferred future flow:

```text
Dashboard UI
→ dashboard API routes
→ shared service/repository layer
→ MongoDB
```

Discord actions that require live bot state should go through a deliberately designed bot-side API or queue in a later phase.

## Not Implemented Yet

- frontend application code
- guild authorization and scoped access enforcement
- settings write endpoints
- moderation write actions from the web
- deployment config for a dashboard frontend

That is intentional. The backend/auth base exists; the operator-facing web UI is still a later phase.
