# World Tree Dashboard API Foundation

This folder documents the current dashboard-facing API shape.

Implemented today in `src/api/routes`:

- `GET /v1/auth/login`
- `GET /v1/auth/callback`
- `GET /v1/auth/me`
- `POST /v1/auth/logout`
- `GET /v1/health`
- `GET /v1/guilds/:guildId/settings`
- `GET /v1/guilds/:guildId/cases`
- `GET /v1/guilds/:guildId/stats`

Still planned for a future dashboard phase:

- write endpoints for settings and moderation actions
- guild-scoped authorization checks beyond identity/session validation
- browser dashboard runtime

## Future Write Route Shape

- `PATCH /v1/guilds/:guildId/settings/modlog`
- `PATCH /v1/guilds/:guildId/settings/trusted-roles`
- `PATCH /v1/guilds/:guildId/settings/automod`
- `GET /v1/guilds/:guildId/cases/:caseId`
- `PATCH /v1/guilds/:guildId/cases/:caseId/resolve`
- `DELETE /v1/guilds/:guildId/cases/:caseId`

## Auth Notes

Future dashboard phases should use Discord OAuth2, verify guild membership, and
require Manage Guild or persisted trusted-admin access before exposing settings
or moderation data.
