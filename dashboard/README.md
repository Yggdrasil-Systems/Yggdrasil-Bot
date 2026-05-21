# World Tree Dashboard Foundation

This directory is a dashboard foundation, not a production dashboard implementation.

Phase 4 adds concrete data contracts and planning documents so a future web dashboard can be built against the same settings and moderation boundaries used by the bot.

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

- OAuth login
- Session storage
- API server
- Frontend framework
- Deployment config

That is intentional. Authentication, guild selection, permission checks, hosting, and deployment boundaries should be their own focused phase.
