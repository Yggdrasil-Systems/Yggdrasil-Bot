import { buildErrorEmbed, buildSuccessEmbed } from '../utils/embeds.js';

function getQueue(interaction) {
  return interaction.appContext?.playerService?.getGuildQueue(interaction.guildId);
}

function requireQueue(interaction, resolveQueue = getQueue) {
  const queue = resolveQueue(interaction);

  if (!queue || !queue.currentTrack) {
    interaction.reply({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now. Use `tree play` to start.')],
      flags: 64
    });
    return null;
  }

  return queue;
}

export const prefix = 'queue_';

export async function handle(interaction, { resolveQueue = getQueue } = {}) {
  if (!interaction.customId?.startsWith(prefix)) {
    return false;
  }

  if (!interaction?.isButton?.() || interaction.customId !== 'queue_clear') {
    return false;
  }

  const queue = requireQueue(interaction, resolveQueue);
  if (!queue) {
    return true;
  }

  const clearedCount = queue.tracks.data.length;
  queue.tracks.clear();

  const details = clearedCount > 0
    ? `Cleared **${clearedCount}** queued track${clearedCount === 1 ? '' : 's'}. The current track will finish playing.`
    : 'The queue was already empty. The current track will finish playing.';

  await interaction.reply({
    embeds: [buildSuccessEmbed('🗑️ Queue Cleared', details)],
    flags: 64
  });

  return true;
}

export const handleQueueClearInteraction = handle;
