import { buildErrorEmbed, buildSuccessEmbed } from '../utils/embeds.js';
import { buildFilterComponents } from '../utils/components.js';
import { getGuildQueue } from '../services/playerService.js';

function getQueue(interaction) {
  return getGuildQueue(interaction.guildId);
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

const FILTER_LABELS = {
  bassboost: 'Bass Boost',
  nightcore: 'Nightcore',
  vaporwave: 'Vaporwave',
  '8d': '8D Audio'
};

const FILTER_TARGETS = {
  bassboost: 'bassboost',
  nightcore: 'nightcore',
  vaporwave: 'vaporwave',
  '8d': '8D'
};

export async function handleMusicFilterInteraction(interaction, { resolveQueue = getQueue } = {}) {
  if (!interaction?.isButton?.() || !interaction.customId.startsWith('filter_')) {
    return false;
  }

  const queue = requireQueue(interaction, resolveQueue);
  if (!queue) {
    return true;
  }

  const filterName = interaction.customId.replace('filter_', '');

  if (filterName === 'clear') {
    await queue.filters.ffmpeg.setInputArgs([]);
    await interaction.update({
      embeds: [buildSuccessEmbed('🗑️ Filters Cleared', 'All audio filters have been removed.')],
      components: buildFilterComponents()
    });
    return true;
  }

  const dpFilterName = FILTER_TARGETS[filterName];

  if (!dpFilterName) {
    return false;
  }

  await queue.filters.ffmpeg.toggle([dpFilterName]);
  await interaction.update({
    embeds: [buildSuccessEmbed(`🎛️ ${FILTER_LABELS[filterName] ?? dpFilterName}`, `**${FILTER_LABELS[filterName] ?? dpFilterName}** filter has been toggled.`)],
    components: buildFilterComponents()
  });

  return true;
}
