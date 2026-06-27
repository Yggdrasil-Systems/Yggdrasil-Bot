# Music System Notes

## Current Shape

The music subsystem uses:

- `discord-player`
- `discord-player-youtubei`
- `yt-dlp-exec`
- a closure-scoped `playerService` injected through `AppContext`

## Main Files

- `src/services/musicService.js`
- `src/services/playerService.js`
- `src/services/musicChannelService.js`
- `src/commands/music/*`
- `src/interactions/music*`

## Lifecycle

1. `bootstrap.js` creates a fresh `playerService`.
2. `initializePlayer(client, playerService)` creates the `Player` and stores it through the service.
3. Music commands and interaction handlers resolve queues through `appContext.playerService`.
4. `yt-dlp` subprocesses are cleaned up through stream close/error hooks plus a safety timeout.

## Known Constraints

- stream extraction still depends on external provider stability
- long-running music process behavior should continue to be monitored under real workload
