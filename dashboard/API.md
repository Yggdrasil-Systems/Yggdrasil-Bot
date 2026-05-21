# World Tree Dashboard API Foundation

This folder is a dependency-free dashboard foundation. It defines the data
contracts and route shape a future authenticated dashboard can use without
adding a web runtime to the bot process in Phase 4.

## Planned Route Shape

- `GET /api/guilds/:guildId/settings`
- `PATCH /api/guilds/:guildId/settings/modlog`
- `PATCH /api/guilds/:guildId/settings/trusted-roles`
- `PATCH /api/guilds/:guildId/settings/automod`
- `GET /api/guilds/:guildId/cases`
- `GET /api/guilds/:guildId/cases/:caseId`
- `PATCH /api/guilds/:guildId/cases/:caseId/resolve`
- `DELETE /api/guilds/:guildId/cases/:caseId`

## Auth Notes

Future dashboard phases should use Discord OAuth2, verify guild membership, and
require Manage Guild or persisted trusted-admin access before exposing settings
or moderation data.
