# World Tree

World Tree is a modular Discord utility, music, settings, automod, and moderation bot for a private friend/community server. It is built with Node.js, discord.js, MongoDB Atlas, Mongoose, and a hybrid command model that supports slash commands, `tree` prefix commands, and bot-managed no-prefix shortcuts.

The project favors practical foundations: clean architecture, persistent moderation history, configurable server behavior, polished embeds, and reliable moderator workflows. Future dashboard, analytics, atmosphere, AI, or memory systems should build on these boundaries rather than replacing them.

## Current Features

- Slash commands and guild command registration
- Prefix commands using exactly `tree`
- Bot-managed no-prefix shortcut allowlist
- MongoDB-backed guild settings
- MongoDB-backed moderation cases
- MongoDB-backed no-prefix privileges
- Configurable mod-log channel
- Persisted trusted admin roles
- Configurable automod for bad words, mention spam, repeated messages, link spam, and caps spam
- Moderation lifecycle commands for viewing, listing, resolving, deleting, and summarizing cases
- Utility commands for user, server, role, banner, avatar, runtime, stats, and dashboard status
- Interactive category-based help menu
- Full music system with multi-platform support
- Dependency-free dashboard contracts and planning docs
- Automated tests with Node's built-in test runner

## Music System

World Tree includes a complete music streaming system powered by [discord-player](https://github.com/androz2091/discord-player) with support for Spotify, Apple Music, YouTube, and SoundCloud.

### How It Works

- **Spotify & Apple Music** resolve track metadata, then bridge through YouTube for audio streaming
- **YouTube** uses the [discord-player-youtubei](https://github.com/retrouser955/discord-player-youtubei) extractor (YouTube Music internal API) for stable, accurate playback
- **SoundCloud** streams natively without bridging
- Direct links from any platform are auto-detected and resolved

### Playback Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `play` | `p` | Play a song by name or link |
| `search` | `find` | Search and pick from top 5 results |
| `nowplaying` | `np` | Show the current track with controls |
| `skip` | `s`, `next` | Skip the current track |
| `stop` | `dc`, `disconnect`, `leave` | Stop playback and clear queue |
| `resume` | `pause`, `togglepause` | Pause or resume playback |
| `volume` | `vol` | Set volume (0-100) |
| `queue` | `q` | View the current queue |
| `shuffle` | `mix` | Shuffle the queue |
| `loop` | `repeat` | Cycle loop modes (off/track/queue) |
| `autoplay` | `ap` | Auto-queue related songs |
| `filter` | `fx`, `filters` | Toggle audio effects |
| `join` | `connect`, `summon` | Join voice channel |
| `247` | `stay`, `24/7` | Toggle 24/7 mode |

### Player Controls

Now Playing embeds include two rows of interactive buttons:

**Row 1:** ⏮️ Previous · ⏸️ Pause · ▶️ Resume · ⏭️ Skip · ⚙️ Settings
**Row 2:** 🔀 Shuffle · 📜 Queue · 🔊 Vol+ · 🔉 Vol- · ⏹️ Stop

The ⚙️ Settings button opens a private panel with loop mode selection, autoplay toggle, and audio filter controls.

### Audio Filters

Available filters: `bassboost`, `nightcore`, `vaporwave`, `8D`, `karaoke`, `tremolo`, `vibrato`. Toggle with `tree filter <name>` or via the Settings panel.

### Dedicated Music Channel

Use `setup-music` to create a `#music-requests` channel. Any message in that channel is automatically treated as a play command, with the message auto-deleted after processing.

## Command Model

World Tree routes all supported inputs into the same command architecture.

### Slash Commands

Examples:

```text
/ping
/help
/play query:Night Changes
/search query:One Direction
/settings view
/settings modlog set
/settings automod toggle
/case list
/case view
/warn
/timeout
/purge
/dashboard
```

### Prefix Commands

The prefix is exactly:

```text
tree
```

It is case-insensitive and requires whitespace after the prefix:

```text
tree ping
Tree play ishq wala love
TREE warn @user "Repeated spam"
tree search Night Changes
```

`treeping` does not trigger the bot.

### No-Prefix Shortcuts

Approved shortcuts can be used only by explicitly allowlisted users or the bot owner:

```text
ping
userinfo @user
play some song
purge 10
case list
```

Normal users are ignored silently. Server owner status, Administrator permission, and trusted server roles do not automatically grant no-prefix access.

No-prefix access is global and bot-managed, not inherited from server permissions. Manage it with:

```text
tree noprefix add @user
tree noprefix remove @user
tree noprefix list
```

Only the configured bot owner can manage this allowlist.

## Settings And Automod

Settings are stored per guild in MongoDB.

Useful commands:

- `/settings view`
- `/settings modlog set`
- `/settings trusted-role add`
- `/settings trusted-role remove`
- `/settings trusted-role list`
- `/settings automod view`
- `/settings automod toggle`
- `/settings automod threshold`
- `/settings automod punishment`
- `/settings automod badword add`
- `/settings automod badword remove`
- `/settings automod badword list`

Prefix equivalents include:

```text
tree settings view
tree modlog #mod-log
tree trustedrole add @Staff
tree automod view
tree automod on
tree automod threshold mentionSpam 6
tree automod punishment badWords timeout 10m
tree automod badword add blockedword
```

Automod is settings-driven and currently supports:

- Bad word filtering
- Mention spam
- Repeated message spam
- Link spam with allowlist support
- Caps spam
- Delete, warn, and timeout punishments
- Persistent automod cases
- Mod-log output when configured

Automod uses in-memory rolling windows for spam checks. It does not require Redis in this phase.

## Moderation

Moderation commands:

- `warn`
- `warnings`
- `timeout`
- `untimeout`
- `kick`
- `ban`
- `purge`

Case lifecycle commands:

- `/case view`
- `/case list`
- `/case resolve`
- `/case delete`
- `/case stats`

Cases are soft-deleted instead of physically removed. Moderation services enforce permissions, role hierarchy, bot capability checks, reason validation, persistence, and logging.

## Utility Commands

- `ping`
- `avatar`
- `banner`
- `userinfo`
- `serverinfo`
- `roleinfo`
- `botinfo`
- `uptime`
- `membercount`
- `stats`
- `dashboard`
- `help`

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
DASHBOARD_URL=
NODE_ENV=development

# Spotify (optional - improves Spotify search accuracy)
DP_SPOTIFY_CLIENT_ID=your_spotify_client_id
DP_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

`GUILD_ID` is used for development slash-command registration. Runtime startup does not require it.
`BOT_OWNER_ID` is required if you want to manage the global no-prefix allowlist.
`DP_SPOTIFY_CLIENT_ID` and `DP_SPOTIFY_CLIENT_SECRET` are optional. The Spotify extractor can work without them via web scraping, but API credentials improve search accuracy and reduce rate limiting. Get them free from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

## Discord Setup

In the Discord Developer Portal:

- Create or select the application
- Add a bot user
- Copy the bot token into `.env`
- Copy the application client ID into `.env`
- Enable Message Content intent for prefix commands and automod
- Enable Server Members intent for member fetches, moderation checks, and role-aware utilities
- Invite the bot with permissions needed for moderation actions and voice (Connect, Speak)

World Tree currently uses:

- `Guilds`
- `GuildMembers`
- `GuildMessages`
- `MessageContent`
- `GuildVoiceStates`

## MongoDB

World Tree uses MongoDB Atlas through Mongoose.

Collections:

- `guild_settings`
- `moderation_cases`
- `counters`
- `no_prefix_privileges`

Existing guild settings are normalized through service defaults, so adding nested settings does not require a migration script.

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
│   ├── music/
│   │   ├── play.js
│   │   ├── search.js
│   │   ├── nowplaying.js
│   │   ├── skip.js
│   │   ├── stop.js
│   │   ├── resume.js
│   │   ├── volume.js
│   │   ├── queue.js
│   │   ├── shuffle.js
│   │   ├── loop.js
│   │   ├── autoplay.js
│   │   ├── filter.js
│   │   ├── join.js
│   │   └── 247.js
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
│   └── automod/
└── utils/
```

## Architecture

```text
Discord interaction or message
→ router / parser
→ command adapter
→ service layer
→ repository layer
→ MongoDB / Discord action
→ response or moderation log
```

Commands stay thin. Services own business behavior. Repositories isolate MongoDB access. Utilities centralize formatting, parsing, embeds, and response mechanics.

## Dashboard Foundation

The dashboard is not a production web app yet. The `dashboard/` directory contains contracts, route plans, and wireframe notes for a later authenticated dashboard phase.

Current dashboard foundation:

- `dashboard/contracts/guild-settings.schema.json`
- `dashboard/contracts/automod-settings.schema.json`
- `dashboard/contracts/moderation-case.schema.json`
- `dashboard/API.md`
- `dashboard/WIREFRAMES.md`

No OAuth, sessions, API server, or frontend runtime is implemented in this phase.

## Roadmap

Near-term:

- More settings controls for ignored automod roles/channels
- Better pagination for case history
- More granular automod allowlists
- Dashboard OAuth and API implementation
- Lyrics command integration

Later:

- Server atmosphere systems
- Analytics summaries
- AI/context-aware features
- Memory systems
