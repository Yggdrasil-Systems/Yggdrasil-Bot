import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { formatMusicErrorMessage } from './play.js';

export const name = 'filter';
export const aliases = ['fx', 'filters'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('filter')
  .setDescription('Toggle audio filters on the music player.')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('Filter to toggle (or "clear" to remove all)')
      .addChoices(
        { name: 'Bass Boost', value: 'bassboost' },
        { name: 'Nightcore', value: 'nightcore' },
        { name: 'Vaporwave', value: 'vaporwave' },
        { name: '8D Audio', value: '8D' },
        { name: 'Karaoke', value: 'karaoke' },
        { name: 'Tremolo', value: 'tremolo' },
        { name: 'Vibrato', value: 'vibrato' },
        { name: 'Clear All', value: 'clear' }
      )
  );

const FILTER_EMOJIS = {
  bassboost: '🔈',
  nightcore: '🌙',
  vaporwave: '🌊',
  '8D': '🎧',
  karaoke: '🎤',
  tremolo: '〰️',
  vibrato: '🎸'
};

async function executeFilter(filterName, guildId, playerService, respond) {
  const queue = playerService?.getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  // Show active filters if no filter specified
  if (!filterName) {
    const active = queue.filters.ffmpeg.getFiltersEnabled();
    const list =
      active.length > 0 ? active.map((f) => `${FILTER_EMOJIS[f] || '🎛️'} **${f}**`).join('\n') : '*No active filters*';

    return respond({
      embeds: [buildSuccessEmbed('🎛️ Active Filters', list)]
    });
  }

  // Clear all filters
  if (filterName === 'clear') {
    await queue.filters.ffmpeg.setFilters(false);
    return respond({
      embeds: [buildSuccessEmbed('🗑️ Filters Cleared', 'All audio filters have been removed.')]
    });
  }

  // Toggle the specified filter
  const emoji = FILTER_EMOJIS[filterName] || '🎛️';

  try {
    await queue.filters.ffmpeg.toggle([filterName]);
    const isEnabled = queue.filters.ffmpeg.getFiltersEnabled().includes(filterName);
    const status = isEnabled ? 'enabled' : 'disabled';

    return respond({
      embeds: [buildSuccessEmbed(`${emoji} ${filterName}`, `**${filterName}** has been **${status}**.`)]
    });
  } catch (err) {
    return respond({
      embeds: [buildErrorEmbed('Filter Error', `Could not apply filter: ${formatMusicErrorMessage(err)}`)]
    });
  }
}

export async function execute(interaction) {
  const filterName = interaction.options.getString('name') || null;
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;
  await executeFilter(filterName, interaction.guild.id, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const filterName = context.args[0]?.toLowerCase() || null;
  const playerService = context.appContext?.playerService ?? null;
  await executeFilter(filterName, context.guild.id, playerService, async (payload) => {
    await context.respond(payload);
  });
}
