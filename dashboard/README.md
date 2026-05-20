# World Tree Dashboard Foundation

This directory is a dashboard foundation, not a production dashboard implementation.

The bot now has persistent guild settings and moderation cases, which are the right backend foundation for a future dashboard. A full dashboard should wait until the project has a deliberate design for Discord OAuth, guild selection, permission checks, hosting, sessions, and API boundaries.

## Proposed Dashboard Scope

Initial dashboard features should be limited to:

- View connected guilds available to the signed-in admin
- View and update mod-log channel
- View moderation cases
- View warning history by user
- Configure trusted admin roles
- Configure automod settings after automod is implemented

## Suggested Future Structure

```text
dashboard/
├── README.md
├── app/
│   ├── guilds/
│   ├── settings/
│   └── moderation/
├── server/
│   ├── auth/
│   ├── routes/
│   └── services/
└── shared/
    └── contracts/
```

## Architecture Boundary

The dashboard should not import bot command files directly.

Preferred future flow:

```text
Dashboard UI
→ dashboard API routes
→ shared service/repository layer
→ MongoDB
```

Discord actions that require live bot state should go through a carefully designed bot-side API or queue in a later phase. Do not couple the dashboard directly to Discord event handlers.

## Not Implemented Yet

- OAuth login
- Session storage
- API server
- Frontend framework
- Deployment config

This is intentional scope control. The current phase focuses on the bot's persistent moderation foundation.
