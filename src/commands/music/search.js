import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { QueryType } from 'discord-player';
import { getPlayer } from '../../services/playerService.js';
import { buildBaseEmbed, buildErrorEmbed } from '../../utils/embeds.js';
import { executePlay } from './play.js';
import { logger } from '../../utils/logger.js';
import { COLORS } from '../../utils/constants.js';

export const name = 'search';
export const aliases = ['find'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search for a song and pick from results.')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Song name or artist')
      .setRequired(true));

// Store search results temporarily for select menu resolution
const searchCache = new Map();

async function executeSearch(query, voiceChannel, user, textChannel, respond) {
  if (!voiceChannel) {
    return respond({
      embeds: [buildErrorEmbed('Voice Channel Required', 'You need to be in a voice channel to play music.')]
    });
  }

  const musicPlayer = getPlayer();

  if (!musicPlayer) {
    return respond({
      embeds: [buildErrorEmbed('Music Unavailable', 'The music system is not ready yet. Try again in a moment.')]
    });
  }

  let result;
  try {
    result = await musicPlayer.search(query, {
      requestedBy: user,
      searchEngine: QueryType.AUTO_SEARCH
    });
  } catch (err) {
    logger.error(`Search failed: ${err.message}`);
    return respond({
      embeds: [buildErrorEmbed('Search Failed', `Could not search for that query.\n\`\`\`${err.message.slice(0, 150)}\`\`\``)]
    });
  }

  if (!result || !result.hasTracks()) {
    return respond({
      embeds: [buildErrorEmbed('No Results', `No results found for **${query}**.\nTry a different search term or paste a direct link.`)]
    });
  }

  const tracks = result.tracks.slice(0, 5);
  const cacheKey = user.id;

  // Cache the tracks for when the user makes a selection
  searchCache.set(cacheKey, { tracks, voiceChannel, textChannel, timestamp: Date.now() });

  // Auto-clean cache after 60 seconds
  setTimeout(() => searchCache.delete(cacheKey), 60000);

  const options = tracks.map((track, i) => {
    const src = (track.source || '').toLowerCase();
    const emoji = src.includes('spotify') ? '🟢' : src.includes('youtube') ? '🔴' : src.includes('soundcloud') ? '🟠' : '🎵';
    return {
      label: `${track.title}`.slice(0, 100),
      description: `${track.author} · ${track.duration}`.slice(0, 100),
      value: `${i}`,
      emoji
    };
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`search_select_${user.id}`)
    .setPlaceholder('Pick a track to play...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);

  const description = tracks.map((t, i) =>
    `**${i + 1}.** [${t.title}](${t.url})\nby **${t.author}** · \`${t.duration}\``
  ).join('\n\n');

  await respond({
    embeds: [buildBaseEmbed({
      title: `🔍 Search Results for "${query.slice(0, 50)}"`,
      description,
      color: COLORS.brand
    })],
    components: [row]
  });
}

// Handle the select menu callback
export async function handleSearchSelect(interaction) {
  const cacheKey = interaction.user.id;
  const cached = searchCache.get(cacheKey);

  if (!cached) {
    return interaction.followUp({
      embeds: [buildErrorEmbed('Search Expired', 'This search has expired. Please run `tree search` again.')],
      flags: 64
    });
  }

  const trackIndex = parseInt(interaction.values[0], 10);
  const track = cached.tracks[trackIndex];

  if (!track) {
    return interaction.followUp({
      embeds: [buildErrorEmbed('Invalid Selection', 'Could not find that track. Please try again.')],
      flags: 64
    });
  }

  searchCache.delete(cacheKey);

  // Play the selected track using its URL for exact match
  await executePlay(track.url, cached.voiceChannel, interaction.user, cached.textChannel, async (payload) => {
    await interaction.followUp(payload);
  });
}

export async function execute(interaction) {
  const query = interaction.options.getString('query');
  const voiceChannel = interaction.member.voice.channel;
  const textChannel = interaction.channel;

  await executeSearch(query, voiceChannel, interaction.user, textChannel, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const query = context.args.join(' ');

  if (!query) {
    return context.respond({
      embeds: [buildErrorEmbed('Missing Query', 'Usage: `tree search <song name>`')]
    });
  }

  const voiceChannel = context.member.voice.channel;
  const textChannel = context.message.channel;

  await executeSearch(query, voiceChannel, context.user, textChannel, async (payload) => {
    await context.respond(payload);
  });
}
