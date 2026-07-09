/**
 * @file Phase 2 factory for the discord-player player service.
 *
 * The player instance is no longer held at module scope (a shared, process-wide
 * singleton). Instead, `createPlayerService()` returns a fresh service object
 * whose internal `player` state lives inside the factory closure.
 *
 * The returned object exposes the same three operations the module previously
 * exported:
 *   - `setPlayer(playerInstance)` — stores the active discord-player instance
 *     and returns it.
 *   - `getPlayer()` — returns the currently stored player (or `null`).
 *   - `getGuildQueue(guildId)` — returns `player.nodes.get(guildId)` or
 *     `null` when no player is registered.
 *
 * Typical usage: the application constructs ONE service during bootstrap and
 * exposes it via `appContext.playerService` so that interaction handlers can
 * pull it from their per-call `appContext` instead of importing a shared
 * module-level singleton.
 *
 * @module services/playerService
 */

/**
 * Create a new player service with its own internal state.
 *
 * @returns {{
 *   setPlayer: (nextPlayer: unknown) => unknown,
 *   getPlayer: () => unknown,
 *   getGuildQueue: (guildId: string) => unknown
 * }} A player service instance with isolated state.
 */
export function createPlayerService() {
  let player = null;

  function setPlayer(nextPlayer) {
    player = nextPlayer;
    return player;
  }

  function getPlayer() {
    return player;
  }

  function getGuildQueue(guildId) {
    return player?.nodes?.get(guildId) ?? null;
  }

  return { setPlayer, getPlayer, getGuildQueue };
}

export function isQueueVoiceChannelMatch(queue, voiceChannel) {
  return !queue?.channel?.id || queue.channel.id === voiceChannel?.id;
}
