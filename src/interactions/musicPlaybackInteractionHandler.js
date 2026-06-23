import { buildErrorEmbed, buildSuccessEmbed, buildQueueEmbed, buildNeutralEmbed } from '../utils/embeds.js';
import { buildQueueComponents } from '../utils/components.js';
import { getGuildQueue } from '../services/playerService.js';

function getQueue(interaction) {
  return getGuildQueue(interaction.guildId);
}

function requireQueue(interaction, resolveQueue = getQueue, allowEmptyTrack = false) {
  const queue = resolveQueue(interaction);

  if (!queue || (!allowEmptyTrack && !queue.currentTrack)) {
    interaction.reply({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now. Use `tree play` to start.')],
      flags: 64
    });
    return null;
  }

  return queue;
}

function buildVolumeLabel(volume) {
  const nextVolume = Math.min(100, Math.max(0, volume));
  return `${nextVolume}%`;
}

export async function handleMusicPlaybackInteraction(interaction, { resolveQueue = getQueue } = {}) {
  if (!interaction?.isButton?.() || !interaction.customId.startsWith('music_')) {
    return false;
  }

  const id = interaction.customId;

  if (id === 'music_pause') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    if (queue.node.isPaused()) {
      await interaction.reply({
        embeds: [buildNeutralEmbed('Already Paused', 'The music is already paused. Click **Resume** ▶️ to continue.')],
        flags: 64
      });
      return true;
    }

    queue.node.setPaused(true);
    await interaction.reply({
      embeds: [buildSuccessEmbed('⏸️ Paused', 'Music has been paused.')],
      flags: 64
    });
    return true;
  }

  if (id === 'music_resume') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    if (!queue.node.isPaused()) {
      await interaction.reply({
        embeds: [buildNeutralEmbed('Already Playing', 'The music is already playing!')],
        flags: 64
      });
      return true;
    }

    queue.node.setPaused(false);
    await interaction.reply({
      embeds: [buildSuccessEmbed('▶️ Resumed', 'Music has been resumed.')],
      flags: 64
    });
    return true;
  }

  if (id === 'music_skip') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    const skippedTitle = queue.currentTrack?.title || 'current track';
    queue.node.skip();

    await interaction.reply({
      embeds: [buildSuccessEmbed('⏭️ Skipped', `Skipped **${skippedTitle}**.`)]
    });
    return true;
  }

  if (id === 'music_previous') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    try {
      await queue.history.previous();
      await interaction.reply({
        embeds: [buildSuccessEmbed('⏮️ Previous', 'Playing the previous track.')],
        flags: 64
      });
    } catch {
      await interaction.reply({
        embeds: [buildErrorEmbed('No Previous Track', 'There is no previous track in history.')],
        flags: 64
      });
    }

    return true;
  }

  if (id === 'music_stop') {
    const queue = resolveQueue(interaction);
    if (!queue) {
      await interaction.reply({
        embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')],
        flags: 64
      });
      return true;
    }

    queue.delete();
    await interaction.reply({
      embeds: [buildSuccessEmbed('⏹️ Stopped', 'Stopped the music and cleared the queue.')]
    });
    return true;
  }

  if (id === 'music_shuffle') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    if (queue.tracks.data.length === 0) {
      await interaction.reply({
        embeds: [buildErrorEmbed('Nothing to Shuffle', 'The queue is empty.')],
        flags: 64
      });
      return true;
    }

    queue.tracks.shuffle();
    await interaction.reply({
      embeds: [buildSuccessEmbed('🔀 Shuffled', `Shuffled **${queue.tracks.data.length}** tracks!`)],
      flags: 64
    });
    return true;
  }

  if (id === 'music_queue') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    await interaction.reply({
      embeds: [buildQueueEmbed(queue)],
      components: queue.tracks.data.length > 0 ? buildQueueComponents() : [],
      flags: 64
    });
    return true;
  }

  if (id === 'music_volup') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    const newVol = Math.min(100, (queue.node.volume ?? 80) + 10);
    queue.node.setVolume(newVol);

    await interaction.reply({
      embeds: [buildSuccessEmbed('🔊 Volume Up', `Volume set to **${buildVolumeLabel(newVol)}**`)],
      flags: 64
    });
    return true;
  }

  if (id === 'music_voldown') {
    const queue = requireQueue(interaction, resolveQueue);
    if (!queue) return true;

    const newVol = Math.max(0, (queue.node.volume ?? 80) - 10);
    queue.node.setVolume(newVol);

    await interaction.reply({
      embeds: [buildSuccessEmbed('🔉 Volume Down', `Volume set to **${buildVolumeLabel(newVol)}**`)],
      flags: 64
    });
    return true;
  }

  return false;
}
