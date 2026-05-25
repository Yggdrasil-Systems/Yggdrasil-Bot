import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { buildNowPlayingEmbed, buildSuccessEmbed, buildErrorEmbed, buildNeutralEmbed } from '../utils/embeds.js';
import { buildMusicPlayerComponents } from '../utils/components.js';
import { logger } from '../utils/logger.js';
import ytDlp from 'yt-dlp-exec';

export let player = null;

// ─── Safe channel sender ────────────────────────────────────────────────────

function safeSend(queue, payload) {
  try {
    const channel = queue?.metadata?.channel;
    if (channel?.send) {
      channel.send(payload).catch((err) => {
        logger.warn(`Failed to send music event message: ${err.message}`);
      });
    }
  } catch (err) {
    logger.error('Unexpected error in safeSend:', err.message);
  }
}

// ─── Source detection helper ────────────────────────────────────────────────

function getSourceEmoji(track) {
  const src = (track.source || track.raw?.source || '').toLowerCase();
  if (src.includes('spotify')) return '🟢';
  if (src.includes('apple')) return '🍎';
  if (src.includes('youtube')) return '🔴';
  if (src.includes('soundcloud')) return '🟠';
  return '🎵';
}

function getSourceLabel(track) {
  const src = (track.source || track.raw?.source || '').toLowerCase();
  if (src.includes('spotify')) return 'Spotify';
  if (src.includes('apple')) return 'Apple Music';
  if (src.includes('youtube')) return 'YouTube';
  if (src.includes('soundcloud')) return 'SoundCloud';
  return 'Unknown';
}

export { getSourceEmoji, getSourceLabel };

// ─── Stream Interceptor ─────────────────────────────────────────────────────

function isYouTubeUrl(url) {
  return url && /youtube\.com|youtu\.be/i.test(url);
}

export const ytDlpStreamHook = async (track, method, queue) => {
  let url = track.url;
  const source = (track.source || track.raw?.source || '').toLowerCase();
  const needsBridge = ['spotify', 'apple_music', 'apple'].includes(source);

  if (needsBridge) {
    url = `ytsearch1:${track.title} ${track.author} audio`;
    logger.info(`[yt-dlp] Bridging ${source} track: ${track.title}`);
  } else if (!isYouTubeUrl(url)) {
    return null;
  }

  try {
    logger.info(`[yt-dlp] Starting direct stream download for: ${track.title}`);
    const subprocess = ytDlp.exec(url, {
      output: '-',
      format: 'bestaudio/best',
      quiet: true,
      noWarnings: true,
      callHome: false,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    });
    
    subprocess.on('error', err => {
        logger.error(`[yt-dlp] Process error: ${err.message}`);
    });

    logger.info(`[yt-dlp] Stream pipeline created successfully`);
    return subprocess.stdout;
  } catch (err) {
    logger.error(`[yt-dlp] Failed to extract stream for "${track.title}": ${err.message}`);
    return null;
  }
};

// ─── Player initialization ──────────────────────────────────────────────────

export async function initializePlayer(client) {
  player = new Player(client, {
    skipFFmpeg: false
  });

  // 1. Load default extractors (SoundCloud, Spotify metadata, Apple metadata, etc.)
  await player.extractors.loadMulti(DefaultExtractors);

  // 2. Register the YouTubei extractor — this is the critical streaming bridge
  //    Spotify/Apple tracks resolve metadata then bridge through YouTube for audio
  await player.extractors.register(YoutubeiExtractor, {
    // Use YouTube Music for better music-specific results
    streamOptions: {
      useClient: 'ANDROID_MUSIC'
    }
  });

  logger.info('Music extractors loaded: DefaultExtractors + YoutubeiExtractor');

  // ─── Player Events ──────────────────────────────────────────────────────

  player.events.on('playerStart', (queue, track) => {
    const emoji = getSourceEmoji(track);
    safeSend(queue, {
      embeds: [buildNowPlayingEmbed(track, queue)],
      components: buildMusicPlayerComponents()
    });
    logger.info(`Now playing: ${emoji} ${track.title} — ${track.author} [${getSourceLabel(track)}]`);
  });

  player.events.on('audioTrackAdd', (queue, track) => {
    // Only notify if something is already playing (playerStart handles the first track)
    if (queue.isPlaying()) {
      const emoji = getSourceEmoji(track);
      safeSend(queue, {
        embeds: [buildSuccessEmbed(
          `${emoji} Track Queued`,
          `**[${track.title}](${track.url})**\nby **${track.author}** · \`${track.duration}\`\n\n📍 Position in queue: **#${queue.tracks.data.length}**`
        )]
      });
    }
  });

  player.events.on('audioTracksAdd', (queue, tracks) => {
    safeSend(queue, {
      embeds: [buildSuccessEmbed(
        '📋 Tracks Queued',
        `Added **${tracks.length}** tracks to the queue.`
      )]
    });
  });

  player.events.on('playerSkip', (queue, track) => {
    logger.warn(`Skipped unplayable track: ${track.title} — ${track.author}`);
    safeSend(queue, {
      embeds: [buildErrorEmbed(
        'Track Skipped',
        `Could not play **${track.title}**. Skipping to next track.\nThis can happen with age-restricted or region-locked content.`
      )]
    });
  });

  player.events.on('disconnect', (queue) => {
    safeSend(queue, {
      embeds: [buildNeutralEmbed('Disconnected', 'Left the voice channel. See you next time! 👋')]
    });
  });

  player.events.on('emptyChannel', (queue) => {
    if (!queue.metadata?.is247) {
      safeSend(queue, {
        embeds: [buildNeutralEmbed('Empty Channel', 'Everyone left the voice channel. Disconnecting...')]
      });
    }
  });

  player.events.on('emptyQueue', (queue) => {
    if (!queue.metadata?.is247) {
      safeSend(queue, {
        embeds: [buildNeutralEmbed('Queue Finished', 'No more tracks in the queue. Add more with `tree play`!')]
      });
    }
  });

  player.events.on('error', (queue, error) => {
    logger.error('Player error:', error.message);
    safeSend(queue, {
      embeds: [buildErrorEmbed(
        'Playback Error',
        `Something went wrong during playback.\n\`\`\`${error.message.slice(0, 200)}\`\`\``
      )]
    });
  });

  player.events.on('playerError', (queue, error, track) => {
    const trackInfo = track ? `**${track.title}**` : 'the current track';
    logger.error(`Player track error on ${trackInfo}:`, error.message);
    safeSend(queue, {
      embeds: [buildErrorEmbed(
        'Track Error',
        `Failed to stream ${trackInfo}.\n\`\`\`${error.message.slice(0, 200)}\`\`\`\nTry playing it again or use a different source.`
      )]
    });
  });

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    player.events.on('debug', (queue, message) => {
      logger.info(`[Player Debug] ${message}`);
    });
  }

  logger.info('Music player initialized successfully.');
}
