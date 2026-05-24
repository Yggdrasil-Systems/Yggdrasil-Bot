import { buildErrorEmbed, buildSuccessEmbed, buildNowPlayingEmbed, buildQueueEmbed } from '../utils/embeds.js';
import { buildMusicPlayerComponents, resolveQuery } from '../utils/components.js';
import { logger } from '../utils/logger.js';
import { replyToInteraction } from '../utils/responses.js';
import { buildHelpCategoryEmbed, buildHelpComponents, parseHelpComponentId } from '../services/helpService.js';
import { handleInteractionError } from './errorHandler.js';
import { canUseAdminCommand } from './permissionGuard.js';
import { player } from '../services/musicService.js';
import { executePlay } from '../commands/music/play.js';

// Map 2-letter source codes back to full engine names
const SOURCE_MAP = { sp: 'spotify', ap: 'apple', yt: 'youtube', sc: 'soundcloud' };

async function handleUnknownCommand(interaction, log) {
  log.warn(`No command handler found for /${interaction.commandName}.`);

  await replyToInteraction(
    interaction,
    {
      embeds: [
        buildErrorEmbed(
          'Command unavailable',
          'That command is not available right now. Try registering slash commands again.'
        )
      ]
    },
    { ephemeral: true }
  );
}

export async function handleComponentInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
    return;
  }

  const id = interaction.customId;

  // ─── Music Fallback Search Buttons (msf_ prefix) ─────────────────────────
  if (interaction.isButton() && id.startsWith('msf_')) {
    const parts = id.split('_');           // ['msf', 'sp', '<queryKey>']
    const sourceCode = parts[1];
    const queryKey = parts.slice(2).join('_');
    const engine = SOURCE_MAP[sourceCode] || 'spotify';
    const query = resolveQuery(queryKey);

    if (!query) {
      return interaction.reply({
        embeds: [buildErrorEmbed('Expired', 'This search button has expired. Please run the play command again.')],
        flags: 64
      });
    }

    await interaction.deferUpdate();

    const voiceChannel = interaction.member?.voice?.channel;
    const textChannel = interaction.channel;

    await executePlay(query, engine, voiceChannel, interaction.user, textChannel, async (payload) => {
      await interaction.followUp(payload);
    });
    return;
  }

  // ─── Music Playback Control Buttons ───────────────────────────────────────
  if (interaction.isButton() && id.startsWith('music_')) {
    const queue = player?.nodes?.get(interaction.guildId);

    // Shuffle and clear don't need isPlaying check — just need a queue
    if (id === 'music_shuffle') {
      if (!queue || queue.tracks.data.length === 0) {
        return interaction.reply({ embeds: [buildErrorEmbed('Nothing to Shuffle', 'The queue is empty.')], flags: 64 });
      }
      queue.tracks.shuffle();
      return interaction.reply({ embeds: [buildSuccessEmbed('🔀 Shuffled', 'The queue has been shuffled!')], flags: 64 });
    }

    if (id === 'music_clear') {
      if (!queue) {
        return interaction.reply({ embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')], flags: 64 });
      }
      queue.tracks.clear();
      return interaction.reply({ embeds: [buildSuccessEmbed('🗑️ Cleared', 'The queue has been cleared. Current track will finish playing.')], flags: 64 });
    }

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')],
        flags: 64
      });
    }

    if (id === 'music_pause') {
      queue.node.setPaused(!queue.node.isPaused());
      const isPaused = queue.node.isPaused();
      return interaction.reply({
        embeds: [buildSuccessEmbed(
          isPaused ? '⏸️ Paused' : '▶️ Resumed',
          isPaused ? 'Music has been paused.' : 'Music has been resumed.'
        )],
        flags: 64
      });
    }

    if (id === 'music_skip') {
      const skippedTitle = queue.currentTrack?.title || 'current track';
      queue.node.skip();
      return interaction.reply({
        embeds: [buildSuccessEmbed('⏭️ Skipped', `Skipped **${skippedTitle}**.`)]
      });
    }

    if (id === 'music_previous') {
      try {
        await queue.history.previous();
        return interaction.reply({
          embeds: [buildSuccessEmbed('⏮️ Previous', 'Playing the previous track.')],
          flags: 64
        });
      } catch {
        return interaction.reply({
          embeds: [buildErrorEmbed('No Previous Track', 'There is no previous track in history.')],
          flags: 64
        });
      }
    }

    if (id === 'music_stop') {
      queue.delete();
      return interaction.reply({
        embeds: [buildSuccessEmbed('⏹️ Stopped', 'Stopped the music and cleared the queue.')]
      });
    }

    if (id === 'music_loop') {
      const currentMode = queue.repeatMode;
      const nextMode = (currentMode + 1) % 3;
      queue.setRepeatMode(nextMode);
      const labels = ['🔁 Loop Off', '🔂 Looping Track', '🔁 Looping Queue'];
      return interaction.reply({
        embeds: [buildSuccessEmbed('Loop Updated', labels[nextMode])],
        flags: 64
      });
    }

    return;
  }

  // ─── Ping Refresh Button ──────────────────────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'ping_refresh') {
    const { getPingSummary } = await import('../services/utilityService.js');
    const { buildPingEmbed } = await import('../utils/embeds.js');
    const ping = getPingSummary(interaction.message);
    return interaction.update({ embeds: [buildPingEmbed(ping)] });
  }

  // ─── Help Select Menu ────────────────────────────────────────────────────
  if (!interaction.isStringSelectMenu()) {
    return;
  }

  const helpComponent = parseHelpComponentId(interaction.customId);

  if (!helpComponent) {
    return;
  }

  if (interaction.user.id !== helpComponent.requesterId) {
    await replyToInteraction(
      interaction,
      {
        embeds: [
          buildErrorEmbed(
            'Help session locked',
            'This help menu belongs to the user who opened it.'
          )
        ]
      },
      { ephemeral: true }
    );
    return;
  }

  const category = interaction.values[0] ?? 'overview';
  await interaction.update({
    embeds: [buildHelpCategoryEmbed(category)],
    components: buildHelpComponents({
      requesterId: interaction.user.id,
      selectedCategory: category
    })
  });
}

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
      {
        embeds: [
          buildErrorEmbed(
            'Permission required',
            'Only the configured bot owner can use that command.'
          )
        ]
      },
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
      {
        embeds: [
          buildErrorEmbed(
            'Permission required',
            'You do not have permission to use that command.'
          )
        ]
      },
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
