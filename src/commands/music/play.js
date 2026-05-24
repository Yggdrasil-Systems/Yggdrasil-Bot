import { SlashCommandBuilder } from 'discord.js';
import { QueryType } from 'discord-player';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildSuccessEmbed, buildMusicSearchFallbackEmbed } from '../../utils/embeds.js';
import { buildMusicFallbackComponents } from '../../utils/components.js';
import { logger } from '../../utils/logger.js';

export const name = 'play';
export const aliases = ['p'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song from Spotify, Apple Music, or YouTube.')
  .addStringOption(option => 
    option.setName('query')
      .setDescription('The song title or link')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('source')
      .setDescription('Search source (defaults to auto-detect)')
      .addChoices(
        { name: 'Spotify', value: 'spotify' },
        { name: 'Apple Music', value: 'apple' },
        { name: 'YouTube', value: 'youtube' },
        { name: 'SoundCloud', value: 'soundcloud' }
      ));

// ─── URL Detection ──────────────────────────────────────────────────────────

const URL_PATTERNS = {
  spotify: /^https?:\/\/(open\.)?spotify\.com\//i,
  apple: /^https?:\/\/music\.apple\.com\//i,
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i,
  soundcloud: /^https?:\/\/(www\.)?soundcloud\.com\//i,
};

function detectUrlSource(query) {
  for (const [source, pattern] of Object.entries(URL_PATTERNS)) {
    if (pattern.test(query)) return source;
  }
  return null;
}

function isUrl(query) {
  return /^https?:\/\//i.test(query);
}

// ─── Search Engine Mapping ──────────────────────────────────────────────────

function getSearchEngine(source) {
  switch (source) {
    case 'spotify': return QueryType.SPOTIFY_SEARCH;
    case 'apple': return QueryType.APPLE_MUSIC_SEARCH;
    case 'youtube': return QueryType.YOUTUBE_SEARCH;
    case 'soundcloud': return QueryType.SOUNDCLOUD_SEARCH;
    default: return QueryType.AUTO;
  }
}

// The cascade order when one source fails
const SEARCH_CASCADE = ['spotify', 'youtube', 'soundcloud', 'apple'];

/**
 * Core play logic. `textChannel` is the actual Discord TextChannel object
 * used for sending now-playing updates via queue metadata.
 */
export async function executePlay(query, source, voiceChannel, user, textChannel, respond) {
  if (!voiceChannel) {
    return respond({
      embeds: [buildErrorEmbed('Voice Channel Required', 'You need to be in a voice channel to play music.')]
    });
  }

  // ─── URL handling: auto-detect source from URL ──────────────────────────
  const urlSource = detectUrlSource(query);
  if (urlSource || isUrl(query)) {
    // For known URLs, use AUTO which will auto-detect the extractor
    const result = await player.search(query, {
      requestedBy: user,
      searchEngine: QueryType.AUTO
    }).catch(err => {
      logger.error('URL search failed:', err.message);
      return null;
    });

    if (result?.tracks?.length) {
      return await enqueueResult(result, voiceChannel, textChannel, respond);
    }

    // URL didn't resolve — show a helpful error
    return respond({
      embeds: [buildErrorEmbed('Could Not Load', `Failed to load the provided link.\nMake sure the URL is valid and the track/playlist is public.`)]
    });
  }

  // ─── Text search: try the requested source first, then cascade ──────────
  const searchOrder = [source, ...SEARCH_CASCADE.filter(s => s !== source)];

  for (const currentSource of searchOrder) {
    const searchEngine = getSearchEngine(currentSource);
    
    const result = await player.search(query, {
      requestedBy: user,
      searchEngine
    }).catch(err => {
      logger.warn(`Search on ${currentSource} failed: ${err.message}`);
      return null;
    });

    if (result?.tracks?.length) {
      return await enqueueResult(result, voiceChannel, textChannel, respond);
    }
  }

  // All sources exhausted — show fallback with manual buttons
  return respond({
    embeds: [buildMusicSearchFallbackEmbed(query)],
    components: buildMusicFallbackComponents(query) // raw query, not encoded URL
  });
}

/**
 * Enqueue the search result into the player queue.
 */
async function enqueueResult(result, voiceChannel, textChannel, respond) {
  // Preserve existing queue's metadata if it already exists
  const existingQueue = player.nodes.get(voiceChannel.guild.id);
  
  const queue = player.nodes.create(voiceChannel.guild, {
    metadata: existingQueue?.metadata ?? {
      channel: textChannel,
      is247: false
    },
    leaveOnEmpty: existingQueue?.options?.leaveOnEmpty ?? true,
    leaveOnEmptyCooldown: 300000,
    leaveOnEnd: existingQueue?.options?.leaveOnEnd ?? true,
    leaveOnEndCooldown: 300000,
  });

  // Make sure metadata.channel is always set
  if (!queue.metadata.channel) {
    queue.metadata.channel = textChannel;
  }

  try {
    if (!queue.connection) await queue.connect(voiceChannel);
  } catch {
    queue.delete();
    return respond({
      embeds: [buildErrorEmbed('Connection Failed', 'Could not join your voice channel. Check my permissions.')]
    });
  }

  const track = result.tracks[0];
  if (result.playlist) {
    queue.addTrack(result.tracks);
    await respond({
      embeds: [buildSuccessEmbed('Playlist Added', `Added **${result.playlist.title}** (${result.tracks.length} tracks) to the queue.`)]
    });
  } else {
    queue.addTrack(track);
    // Only send "Track Added" if already playing (playerStart handles the first track)
    if (queue.isPlaying()) {
      await respond({
        embeds: [buildSuccessEmbed('Track Added', `Added **${track.title}** by **${track.author}** to the queue.`)]
      });
    }
  }

  if (!queue.isPlaying()) await queue.node.play();
}

export async function execute(interaction) {
  const query = interaction.options.getString('query');
  const source = interaction.options.getString('source') || 'spotify';
  const voiceChannel = interaction.member.voice.channel;
  const textChannel = interaction.channel;

  await executePlay(query, source, voiceChannel, interaction.user, textChannel, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  let query = context.args.join(' ');
  let source = 'spotify';

  // Parse source flags
  const flagMap = { '-apple': 'apple', '-yt': 'youtube', '-sc': 'soundcloud', '-spotify': 'spotify' };
  for (const [flag, src] of Object.entries(flagMap)) {
    if (query.includes(flag)) {
      source = src;
      query = query.replace(flag, '').trim();
      break;
    }
  }

  if (!query) {
    return context.respond({
      embeds: [buildErrorEmbed('Missing Query', 'Please provide a song to play.\n\n**Usage:**\n`tree play <song name>`\n`tree play <song> -yt`\n`tree play <spotify/youtube/apple link>`')]
    });
  }

  const voiceChannel = context.member.voice.channel;
  const textChannel = context.message.channel;

  await executePlay(query, source, voiceChannel, context.user, textChannel, async (payload) => {
    await context.respond(payload);
  });
}
