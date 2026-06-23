import { buildErrorEmbed, buildSuccessEmbed, buildQueueEmbed, buildNeutralEmbed } from '../utils/embeds.js';
import { buildSettingsComponents, buildFilterComponents, buildQueueComponents } from '../utils/components.js';
import { logger } from '../utils/logger.js';
import { replyToInteraction } from '../utils/responses.js';
import { handleHelpSelectInteraction } from '../interactions/helpInteractionHandler.js';
import { handlePingRefreshInteraction } from '../interactions/pingInteractionHandler.js';
import { handleSearchSelectInteraction } from '../interactions/searchInteractionHandler.js';
import { handleQueueClearInteraction } from '../interactions/queueInteractionHandler.js';
import { handleMusicSettingsInteraction } from '../interactions/musicSettingsInteractionHandler.js';
import { handleInteractionError } from './errorHandler.js';
import { canUseAdminCommand } from './permissionGuard.js';
import { player } from '../services/musicService.js';

async function handleUnknownCommand(interaction, log) {
  log.warn(`No command handler found for /${interaction.commandName}.`);
  await replyToInteraction(
    interaction,
    { embeds: [buildErrorEmbed('Command unavailable', 'That command is not available right now.')] },
    { ephemeral: true }
  );
}

// ─── Helper: get queue or reply with error ──────────────────────────────────

function getQueue(interaction) {
  return player?.nodes?.get(interaction.guildId) ?? null;
}

function requireQueue(interaction) {
  const queue = getQueue(interaction);
  if (!queue || !queue.currentTrack) {
    interaction.reply({ embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now. Use `tree play` to start.')], flags: 64 });
    return null;
  }
  return queue;
}

// ─── Component Interaction Handler ──────────────────────────────────────────

export async function handleComponentInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
    return;
  }

  const id = interaction.customId;

  try {
    // ─── Music Playback Control Buttons ────────────────────────────────────
    if (interaction.isButton() && id.startsWith('music_')) {

      // Pause — only pauses, does NOT toggle
      if (id === 'music_pause') {
        const queue = requireQueue(interaction);
        if (!queue) return;

        if (queue.node.isPaused()) {
          return interaction.reply({
            embeds: [buildNeutralEmbed('Already Paused', 'The music is already paused. Click **Resume** ▶️ to continue.')],
            flags: 64
          });
        }
        queue.node.setPaused(true);
        return interaction.reply({
          embeds: [buildSuccessEmbed('⏸️ Paused', 'Music has been paused.')],
          flags: 64
        });
      }

      // Resume — only resumes
      if (id === 'music_resume') {
        const queue = requireQueue(interaction);
        if (!queue) return;

        if (!queue.node.isPaused()) {
          return interaction.reply({
            embeds: [buildNeutralEmbed('Already Playing', 'The music is already playing!')],
            flags: 64
          });
        }
        queue.node.setPaused(false);
        return interaction.reply({
          embeds: [buildSuccessEmbed('▶️ Resumed', 'Music has been resumed.')],
          flags: 64
        });
      }

      if (id === 'music_skip') {
        const queue = requireQueue(interaction);
        if (!queue) return;
        const skippedTitle = queue.currentTrack?.title || 'current track';
        queue.node.skip();
        return interaction.reply({
          embeds: [buildSuccessEmbed('⏭️ Skipped', `Skipped **${skippedTitle}**.`)]
        });
      }

      if (id === 'music_previous') {
        const queue = requireQueue(interaction);
        if (!queue) return;
        try {
          await queue.history.previous();
          return interaction.reply({ embeds: [buildSuccessEmbed('⏮️ Previous', 'Playing the previous track.')], flags: 64 });
        } catch {
          return interaction.reply({ embeds: [buildErrorEmbed('No Previous Track', 'There is no previous track in history.')], flags: 64 });
        }
      }

      if (id === 'music_stop') {
        const queue = getQueue(interaction);
        if (!queue) {
          return interaction.reply({ embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')], flags: 64 });
        }
        queue.delete();
        return interaction.reply({
          embeds: [buildSuccessEmbed('⏹️ Stopped', 'Stopped the music and cleared the queue.')]
        });
      }

      // Shuffle
      if (id === 'music_shuffle') {
        const queue = requireQueue(interaction);
        if (!queue) return;
        if (queue.tracks.data.length === 0) {
          return interaction.reply({ embeds: [buildErrorEmbed('Nothing to Shuffle', 'The queue is empty.')], flags: 64 });
        }
        queue.tracks.shuffle();
        return interaction.reply({ embeds: [buildSuccessEmbed('🔀 Shuffled', `Shuffled **${queue.tracks.data.length}** tracks!`)], flags: 64 });
      }

      // Queue display
      if (id === 'music_queue') {
        const queue = requireQueue(interaction);
        if (!queue) return;
        return interaction.reply({
          embeds: [buildQueueEmbed(queue)],
          components: queue.tracks.data.length > 0 ? buildQueueComponents() : [],
          flags: 64
        });
      }

      // Volume up
      if (id === 'music_volup') {
        const queue = requireQueue(interaction);
        if (!queue) return;
        const newVol = Math.min(100, (queue.node.volume ?? 80) + 10);
        queue.node.setVolume(newVol);
        return interaction.reply({ embeds: [buildSuccessEmbed('🔊 Volume Up', `Volume set to **${newVol}%**`)], flags: 64 });
      }

      // Volume down
      if (id === 'music_voldown') {
        const queue = requireQueue(interaction);
        if (!queue) return;
        const newVol = Math.max(0, (queue.node.volume ?? 80) - 10);
        queue.node.setVolume(newVol);
        return interaction.reply({ embeds: [buildSuccessEmbed('🔉 Volume Down', `Volume set to **${newVol}%**`)], flags: 64 });
      }

      return;
    }

    // ─── Settings Panel Buttons ─────────────────────────────────────────────
    if (interaction.isButton() && id.startsWith('settings_')) {
      const queue = requireQueue(interaction);
      if (!queue) return;

      if (id === 'settings_loop_off') {
        queue.setRepeatMode(0);
        return interaction.update({
          embeds: [buildNeutralEmbed('⚙️ Playback Settings', `**Loop Mode:** ➡️ Off\n**Volume:** ${queue.node.volume ?? 80}%`)],
          components: buildSettingsComponents(queue)
        });
      }

      if (id === 'settings_loop_track') {
        queue.setRepeatMode(1);
        return interaction.update({
          embeds: [buildNeutralEmbed('⚙️ Playback Settings', `**Loop Mode:** 🔂 Track\n**Volume:** ${queue.node.volume ?? 80}%`)],
          components: buildSettingsComponents(queue)
        });
      }

      if (id === 'settings_loop_queue') {
        queue.setRepeatMode(2);
        return interaction.update({
          embeds: [buildNeutralEmbed('⚙️ Playback Settings', `**Loop Mode:** 🔁 Queue\n**Volume:** ${queue.node.volume ?? 80}%`)],
          components: buildSettingsComponents(queue)
        });
      }

      if (id === 'settings_autoplay') {
        const current = queue.repeatMode;
        const newMode = current === 3 ? 0 : 3;
        queue.setRepeatMode(newMode);
        const label = newMode === 3 ? '📻 Autoplay' : '➡️ Off';
        return interaction.update({
          embeds: [buildNeutralEmbed('⚙️ Playback Settings', `**Loop Mode:** ${label}\n**Volume:** ${queue.node.volume ?? 80}%`)],
          components: buildSettingsComponents(queue)
        });
      }

      if (id === 'settings_filters') {
        return interaction.update({
          embeds: [buildNeutralEmbed('🎛️ Audio Filters', 'Toggle audio effects. Active filters are highlighted.')],
          components: buildFilterComponents()
        });
      }

      return;
    }

    // ─── Filter Buttons ───────────────────────────────────────────────────
    if (interaction.isButton() && id.startsWith('filter_')) {
      const queue = requireQueue(interaction);
      if (!queue) return;

      const filterName = id.replace('filter_', '');

      if (filterName === 'clear') {
        await queue.filters.ffmpeg.setInputArgs([]);
        return interaction.update({
          embeds: [buildSuccessEmbed('🗑️ Filters Cleared', 'All audio filters have been removed.')],
          components: buildFilterComponents()
        });
      }

      // Toggle the filter
      const filterMap = {
        bassboost: 'bassboost',
        nightcore: 'nightcore',
        vaporwave: 'vaporwave',
        '8d': '8D',
      };

      const dpFilterName = filterMap[filterName];
      if (dpFilterName && queue.filters.ffmpeg.filters.includes(dpFilterName)) {
        await queue.filters.ffmpeg.toggle([dpFilterName]);
        return interaction.update({
          embeds: [buildSuccessEmbed(`🎛️ ${dpFilterName}`, `**${dpFilterName}** filter has been toggled.`)],
          components: buildFilterComponents()
        });
      } else if (dpFilterName) {
        await queue.filters.ffmpeg.toggle([dpFilterName]);
        return interaction.update({
          embeds: [buildSuccessEmbed(`🎛️ ${dpFilterName}`, `**${dpFilterName}** filter has been toggled.`)],
          components: buildFilterComponents()
        });
      }

      return;
    }

    // ─── Ping Refresh Button ──────────────────────────────────────────────
    if (await handlePingRefreshInteraction(interaction)) {
      return;
    }

    // ─── Queue + Search Select Menus ────────────────────────────────────
    if (await handleQueueClearInteraction(interaction)) {
      return;
    }

    if (await handleSearchSelectInteraction(interaction)) {
      return;
    }

    // ─── Help Select Menu ───────────────────────────────────────────────
    if (await handleHelpSelectInteraction(interaction)) {
      return;
    }
  } catch (error) {
    logger.error('Component interaction error:', error.message);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [buildErrorEmbed('Error', 'Something went wrong. Please try again.')], flags: 64 });
      }
    } catch { /* interaction expired */ }
  }
}

// ─── Slash Command Handler ──────────────────────────────────────────────────

export async function handleChatInputCommand(interaction, { log = logger } = {}) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    await handleUnknownCommand(interaction, log);
    return;
  }

  const settings = interaction.client.settingsService && interaction.guild?.id
    ? await interaction.client.settingsService.getEffectiveSettings(interaction.guild.id).catch(() => null)
    : null;

  if (command.botOwnerOnly && interaction.user.id !== interaction.client.runtimeConfig?.botOwnerId) {
    await replyToInteraction(
      interaction,
      { embeds: [buildErrorEmbed('Permission required', 'Only the configured bot owner can use that command.')] },
      { ephemeral: true }
    );
    return;
  }

  if (command.adminOnly && !canUseAdminCommand({
    userId: interaction.user.id,
    guildOwnerId: interaction.guild?.ownerId ?? null,
    botOwnerId: interaction.client.runtimeConfig?.botOwnerId ?? null,
    member: interaction.member,
    trustedAdminRoleIds: [
      ...(interaction.client.runtimeConfig?.trustedAdminRoleIds ?? []),
      ...(settings?.trustedAdminRoleIds ?? [])
    ]
  })) {
    await replyToInteraction(
      interaction,
      { embeds: [buildErrorEmbed('Permission required', 'You do not have permission to use that command.')] },
      { ephemeral: true }
    );
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    await handleInteractionError(interaction, error);
  }
}
