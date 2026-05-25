import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';

// ─── Music Player Controls (attached to Now Playing embeds) ─────────────────
//
// Row 1: ⏮️ Previous | ⏸️ Pause | ▶️ Resume | ⏭️ Skip | ⚙️ Settings
// Row 2: 🔀 Shuffle  | 📜 Queue | 🔊 Vol+   | 🔉 Vol- | (empty or reserved)
//
// Discord limit: max 5 buttons per row, max 5 rows total.

export function buildMusicPlayerComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_previous')
      .setLabel('Prev')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏮️'),
    new ButtonBuilder()
      .setCustomId('music_pause')
      .setLabel('Pause')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⏸️'),
    new ButtonBuilder()
      .setCustomId('music_resume')
      .setLabel('Resume')
      .setStyle(ButtonStyle.Success)
      .setEmoji('▶️'),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('Skip')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏭️'),
    new ButtonBuilder()
      .setCustomId('music_settings')
      .setLabel('Settings')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⚙️')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setLabel('Shuffle')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔀'),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜'),
    new ButtonBuilder()
      .setCustomId('music_volup')
      .setLabel('Vol+')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔊'),
    new ButtonBuilder()
      .setCustomId('music_voldown')
      .setLabel('Vol-')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔉'),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⏹️')
  );

  return [row1, row2];
}

// ─── Settings Panel (ephemeral, shown when ⚙️ is clicked) ──────────────────

export function buildSettingsComponents(queue) {
  const loopMode = queue?.repeatMode ?? 0;
  const isAutoplay = loopMode === 3;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_loop_off')
      .setLabel('Loop Off')
      .setStyle(loopMode === 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('➡️'),
    new ButtonBuilder()
      .setCustomId('settings_loop_track')
      .setLabel('Loop Track')
      .setStyle(loopMode === 1 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🔂'),
    new ButtonBuilder()
      .setCustomId('settings_loop_queue')
      .setLabel('Loop Queue')
      .setStyle(loopMode === 2 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🔁'),
    new ButtonBuilder()
      .setCustomId('settings_autoplay')
      .setLabel('Autoplay')
      .setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('📻'),
    new ButtonBuilder()
      .setCustomId('settings_filters')
      .setLabel('Filters')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎛️')
  );

  return [row1];
}

// ─── Filter Selection Panel ─────────────────────────────────────────────────

export function buildFilterComponents() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('filter_bassboost')
      .setLabel('Bass Boost')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔈'),
    new ButtonBuilder()
      .setCustomId('filter_nightcore')
      .setLabel('Nightcore')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🌙'),
    new ButtonBuilder()
      .setCustomId('filter_vaporwave')
      .setLabel('Vaporwave')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🌊'),
    new ButtonBuilder()
      .setCustomId('filter_8d')
      .setLabel('8D Audio')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎧'),
    new ButtonBuilder()
      .setCustomId('filter_clear')
      .setLabel('Clear All')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );

  return [row];
}

// ─── Queue Components ───────────────────────────────────────────────────────

export function buildQueueComponents() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setLabel('Shuffle')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔀'),
    new ButtonBuilder()
      .setCustomId('queue_clear')
      .setLabel('Clear Queue')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );
  return [row];
}

// ─── Search Result Select Menu ──────────────────────────────────────────────

export function buildSearchSelectMenu(tracks, userId) {
  const options = tracks.slice(0, 5).map((track, i) => ({
    label: `${track.title}`.slice(0, 100),
    description: `${track.author} · ${track.duration}`.slice(0, 100),
    value: `${i}`,
    emoji: i === 0 ? '1️⃣' : i === 1 ? '2️⃣' : i === 2 ? '3️⃣' : i === 3 ? '4️⃣' : '5️⃣'
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`search_select_${userId}`)
    .setPlaceholder('Pick a track to play...')
    .addOptions(options);

  return [new ActionRowBuilder().addComponents(menu)];
}
