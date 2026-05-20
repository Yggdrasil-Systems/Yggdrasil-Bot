# World Tree

World Tree is a modular Discord utility and moderation bot for a private friend/community server. It is built around a clean Node.js + discord.js + MongoDB foundation, with polished command responses and a hybrid command model for daily use.

The project is intentionally practical first: utility commands, persistent moderation history, server configuration, and clean moderator workflows. Future atmosphere, analytics, AI, or dashboard features should build on this foundation instead of replacing it.

## Current Features

- Slash commands
- Prefix commands using `tree`
- Privileged no-prefix admin shortcuts
- MongoDB-backed guild settings
- MongoDB-backed moderation cases
- Moderation logs through a configurable log channel
- Utility commands for user, server, role, banner, avatar, and bot info
- Real moderation workflows for warn, warnings, timeout, untimeout, kick, ban, and purge
- Centralized command loading, event loading, response helpers, embeds, parsing, permissions, and services
- Automated tests with Node's built-in test runner

## Command Model

World Tree supports three input styles that route into the same command architecture.

### Slash Commands

Use Discord slash commands for discoverable interactions:

```text
/ping
/avatar
/userinfo
/serverinfo
/banner
/botinfo
/roleinfo
/help
/setmodlog
/warn
/warnings
/timeout
/untimeout
/kick
/ban
/purge
```

### Prefix Commands

The prefix is exactly:

```text
tree
```

It is case-insensitive and requires whitespace after the prefix:

```text
tree ping
Tree avatar @user
TREE warn @user "Repeated spam"
```

`treeping` does not trigger the bot.

### No-Prefix Admin Shortcuts

Trusted admins can use approved shortcuts without the prefix:

```text
ping
userinfo @user
purge 10
```

Normal users are ignored silently. No-prefix access is limited to server owner, configured bot owner, administrators, or configured trusted admin roles.

## Utility Commands

- `ping` - check gateway latency
- `avatar` - show a user's avatar
- `banner` - show a user's profile banner when available
- `userinfo` - show account and server membership details
- `serverinfo` - show server metadata
- `roleinfo` - show role metadata
- `botinfo` - show World Tree runtime details
- `help` - show command categories and usage examples

## Moderation Commands

- `warn` - record a warning case
- `warnings` - view warning history
- `timeout` - apply a timeout and record a case
- `untimeout` - remove a timeout and record a case
- `kick` - kick a member and record a case
- `ban` - ban a user and record a case
- `purge` - delete recent messages and record a case

Moderation commands enforce permission checks, role hierarchy checks, bot capability checks, required reasons, case persistence, and optional mod-log output.

## Environment Variables

Create `.env` in the project root. Do not commit it.

```env
DISCORD_TOKEN=your_discord_bot_token
MONGO_URI=your_mongodb_atlas_connection_string
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_test_discord_server_id
MONGO_SERVER_SELECTION_TIMEOUT_MS=10000
BOT_OWNER_ID=optional_owner_discord_user_id
TRUSTED_ADMIN_ROLE_IDS=optional_role_id,optional_second_role_id
NODE_ENV=development
```

`GUILD_ID` is used for development slash-command registration. Runtime startup does not require it.

## Discord Developer Portal Setup

Enable the bot and configure:

- Bot token
- Application client ID
- Test server/guild ID
- Required bot permissions for moderation commands
- Privileged Message Content intent for prefix commands

World Tree currently uses these gateway intents:

- `Guilds`
- `GuildMessages`
- `MessageContent`

## MongoDB Setup

World Tree uses MongoDB Atlas through Mongoose.

Collections:

- `guild_settings`
- `moderation_cases`

The bot creates settings documents as needed and writes moderation cases whenever moderation actions are recorded.

## Local Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Register slash commands to the configured test guild:

```bash
npm run register:commands
```

Start locally:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

## Project Structure

```text
src/
├── bootstrap.js
├── client.js
├── commands/
│   ├── moderation/
│   ├── setup/
│   └── utility/
├── config/
├── database/
│   └── mongo/
│       ├── models/
│       └── repositories/
├── events/
├── loaders/
├── middleware/
├── services/
└── utils/
```

## Architecture Summary

World Tree follows this flow:

```text
Discord event or interaction
→ router / parser
→ command adapter
→ service layer
→ repository layer
→ MongoDB / Discord action
→ response or moderation log
```

Command files stay thin. Services own business behavior. Repositories isolate MongoDB access. Utilities centralize formatting, parsing, embeds, and response mechanics.

## Dashboard Foundation

Dashboard planning lives in [`dashboard/README.md`](dashboard/README.md). A full dashboard is intentionally not implemented yet because authentication, Discord OAuth, guild selection, permissions, and deployment boundaries should be designed as their own phase.

## Roadmap

Near-term:

- More settings commands
- Automod settings and event handling
- Better moderation history views
- Case resolution/editing workflows
- Dashboard implementation after OAuth and permissions design

Later:

- Server atmosphere systems
- Analytics summaries
- AI/context-aware features
- Memory systems

These later systems should not be added until the core moderation and configuration layers are stable.
