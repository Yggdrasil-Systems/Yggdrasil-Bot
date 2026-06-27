import { SlashCommandBuilder } from 'discord.js';
import { QueryType } from 'discord-player';
import { getSourceEmoji, getSourceLabel, ytDlpStreamHook } from '../../services/musicService.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const name = 'play';
export const aliases = ['p'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song from Spotify, Apple Music, YouTube, or SoundCloud.')
  .addStringOption(option => 
    option.setName('query')
      .setDescription('Song name, artist, or a direct link')
      .setRequired(true));

// ─── URL Detection ──────────────────────────────────────────────────────────

function isUrl(query) {
  return /^https?:\/\//i.test(query);
}

export function formatMusicErrorMessage(error, maxLength = 150) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'Unknown error';

  return message.slice(0, maxLength);
}

/**
 * Core play logic shared by slash and prefix commands.
 *
 * Strategy:
 *   - URLs  → QueryType.AUTO (extractors auto-detect the platform)
 *   - Text  → QueryType.AUTO_SEARCH (iterates all extractors until one returns results)
 *
 * No manual cascade needed — discord-player handles extractor iteration internally.
 */
export async function executePlay(query, voiceChannel, user, textChannel, playerService, respond) {
  if (!voiceChannel) {
    return respond({
      embeds: [buildErrorEmbed('Voice Channel Required', 'You need to be in a voice channel to play music.')]
    });
  }

  const searchEngine = isUrl(query) ? QueryType.AUTO : QueryType.AUTO_SEARCH;
  const musicPlayer = playerService?.getPlayer();

  if (!musicPlayer) {
    return respond({
      embeds: [buildErrorEmbed('Music Unavailable', 'The music system is not ready yet. Try again in a moment.')]
    });
  }

  let result;
  try {
    result = await musicPlayer.search(query, {
      requestedBy: user,
      searchEngine
    });
  } catch (err) {
    logger.error(`Search failed for "${query}".`, err);
    return respond({
      embeds: [buildErrorEmbed('Search Failed', `Could not search for that query.\n\`\`\`${formatMusicErrorMessage(err)}\`\`\`\nTry a different search term or paste a direct link.`)]
    });
  }

  if (!result || !result.hasTracks()) {
    // Provide helpful suggestions based on what the user tried
    const suggestion = isUrl(query)
      ? 'Make sure the link is valid, public, and not age-restricted.'
      : 'Try being more specific (include the artist name), or paste a direct link.';

    return respond({
      embeds: [buildErrorEmbed(
        'No Results Found',
        `Could not find anything for **${query.length > 80 ? query.slice(0, 80) + '...' : query}**\n\n💡 ${suggestion}`
      )]
    });
  }

  // ─── Enqueue ────────────────────────────────────────────────────────────
  const existingQueue = playerService?.getGuildQueue(voiceChannel.guild.id);

  const queue = musicPlayer.nodes.create(voiceChannel.guild, {
    metadata: existingQueue?.metadata ?? {
      channel: textChannel,
      is247: false
    },
    leaveOnEmpty: existingQueue?.metadata?.is247 ? false : true,
    leaveOnEmptyCooldown: 300000,
    leaveOnEnd: existingQueue?.metadata?.is247 ? false : true,
    leaveOnEndCooldown: 300000,
    selfDeaf: true,
    volume: existingQueue?.node?.volume ?? 80,
    onBeforeCreateStream: ytDlpStreamHook,
  });

  // Ensure metadata.channel is always valid
  if (!queue.metadata.channel) {
    queue.metadata.channel = textChannel;
  }

  try {
    if (!queue.connection) await queue.connect(voiceChannel);
  } catch (err) {
    logger.error('Failed to connect to voice channel.', err);
    queue.delete();
    return respond({
      embeds: [buildErrorEmbed('Connection Failed', 'Could not join your voice channel.\nCheck that I have **Connect** and **Speak** permissions.')]
    });
  }

  const track = result.tracks[0];

  if (result.playlist) {
    queue.addTrack(result.tracks);
    const emoji = getSourceEmoji(track);
    await respond({
      embeds: [buildSuccessEmbed(
        `${emoji} Playlist Queued`,
        `**${result.playlist.title}**\n${result.tracks.length} tracks added to the queue.`
      )]
    });
  } else {
    queue.addTrack(track);
    // Only show "queued" if something is already playing (playerStart handles the first track)
    if (queue.isPlaying()) {
      const emoji = getSourceEmoji(track);
      await respond({
        embeds: [buildSuccessEmbed(
          `${emoji} Track Queued`,
          `**[${track.title}](${track.url})**\nby **${track.author}** · \`${track.duration}\`\n\n📍 Position: **#${queue.tracks.data.length}**`
        )]
      });
    }
  }

  if (!queue.isPlaying()) {
    try {
      await queue.node.play();
    } catch (err) {
      logger.error('Failed to start playback.', err);
      return respond({
        embeds: [buildErrorEmbed('Playback Failed', `Could not start playing.\n\`\`\`${formatMusicErrorMessage(err)}\`\`\`\nTry a different track or source.`)]
      });
    }
  }
}

// ─── Slash Command Handler ──────────────────────────────────────────────────

export async function execute(interaction) {
  const query = interaction.options.getString('query');
  const voiceChannel = interaction.member.voice.channel;
  const textChannel = interaction.channel;
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;

  await executePlay(query, voiceChannel, interaction.user, textChannel, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

// ─── Prefix Command Handler ────────────────────────────────────────────────

export async function executeMessage(context) {
  const query = context.args.join(' ');

  if (!query) {
    return context.respond({
      embeds: [buildErrorEmbed(
        'Missing Query',
        'Please provide a song name or link.\n\n**Usage:**\n`tree play <song name>`\n`tree play <spotify/youtube/apple/soundcloud link>`\n\n**Examples:**\n`tree play Night Changes One Direction`\n`tree play https://open.spotify.com/track/...`'
      )]
    });
  }

  const voiceChannel = context.member.voice.channel;
  const textChannel = context.message.channel;
  const playerService = context.appContext?.playerService ?? null;

  await executePlay(query, voiceChannel, context.user, textChannel, playerService, async (payload) => {
    await context.respond(payload);
  });
}
