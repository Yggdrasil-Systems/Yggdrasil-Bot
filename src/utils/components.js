import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createHash } from 'crypto';

// ─── Query Cache for Fallback Buttons ────────────────────────────────────────
// Discord custom IDs are limited to 100 characters.
// For long queries (especially URLs), we store the full query in a cache
// and use a short hash as the custom ID reference.
const queryCache = new Map();

function storeQuery(query) {
  // If the query is short enough to fit in a custom ID directly, use it
  const encoded = encodeURIComponent(query);
  if (encoded.length <= 60) {
    return encoded;
  }
  // Otherwise, hash it and store in cache
  const hash = createHash('md5').update(query).digest('hex').slice(0, 16);
  queryCache.set(hash, query);
  return `h_${hash}`;
}

export function resolveQuery(idPart) {
  if (idPart.startsWith('h_')) {
    const hash = idPart.slice(2);
    return queryCache.get(hash) || null;
  }
  return decodeURIComponent(idPart);
}

// ─── Music Player Controls ──────────────────────────────────────────────────

export function buildMusicPlayerComponents() {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('music_previous')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏮️'),
      new ButtonBuilder()
        .setCustomId('music_pause')
        .setLabel('Pause')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏸️'),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️'),
      new ButtonBuilder()
        .setCustomId('music_skip')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏭️'),
      new ButtonBuilder()
        .setCustomId('music_loop')
        .setLabel('Loop')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔁')
    );

  return [row1];
}

// ─── Fallback Search Buttons ────────────────────────────────────────────────

export function buildMusicFallbackComponents(query) {
  const storedKey = storeQuery(query);
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`msf_sp_${storedKey}`)
        .setLabel('Spotify')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎵'),
      new ButtonBuilder()
        .setCustomId(`msf_ap_${storedKey}`)
        .setLabel('Apple Music')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🍎'),
      new ButtonBuilder()
        .setCustomId(`msf_yt_${storedKey}`)
        .setLabel('YouTube')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('▶️'),
      new ButtonBuilder()
        .setCustomId(`msf_sc_${storedKey}`)
        .setLabel('SoundCloud')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('☁️')
    );

  return [row];
}

// ─── Shuffle Button ─────────────────────────────────────────────────────────

export function buildQueueComponents() {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setLabel('Shuffle')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔀'),
      new ButtonBuilder()
        .setCustomId('music_clear')
        .setLabel('Clear Queue')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️')
    );

  return [row];
}
