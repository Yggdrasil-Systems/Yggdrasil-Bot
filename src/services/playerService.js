let player = null;

export function setPlayer(nextPlayer) {
  player = nextPlayer;
  return player;
}

export function getPlayer() {
  return player;
}

export function getGuildQueue(guildId) {
  return player?.nodes?.get(guildId) ?? null;
}
