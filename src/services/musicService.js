import { Player, StreamType } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import playdl from 'play-dl';
import { buildNowPlayingEmbed, buildSuccessEmbed, buildErrorEmbed, buildNeutralEmbed } from '../utils/embeds.js';
import { buildMusicPlayerComponents } from '../utils/components.js';
import { logger } from '../utils/logger.js';

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

// ─── Source detection helpers ────────────────────────────────────────────────

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

// ─── Determine if a URL is a YouTube URL ────────────────────────────────────

function isYouTubeUrl(url) {
  return url && /youtube\.com|youtu\.be/i.test(url);
}

// ─── Player initialization ──────────────────────────────────────────────────

export async function initializePlayer(client) {
  player = new Player(client, {
    // play-dl handles stream delivery, so FFmpeg can process whatever comes back.
    // Leave skipFFmpeg: false so discord-player applies the DSP pipeline correctly.
    skipFFmpeg: false,

    // ── onBeforeCreateStream ───────────────────────────────────────────────
    // This hook runs before the extractor tries to build a stream.
    // We intercept YouTube-sourced tracks and bridge Spotify/Apple tracks
    // to use play-dl directly, which:
    //   - does not rely on youtubei.js's client-type-specific URL generation
    //   - works with ffmpeg-static for correct Opus encoding
    onBeforeCreateStream: async (track, method, queue) => {
      let url = track.url;
      const source = (track.source || track.raw?.source || '').toLowerCase();
      const needsBridge = ['spotify', 'apple_music', 'apple'].includes(source);

      if (needsBridge) {
        try {
          logger.info(`[play-dl] Bridging ${source} track: ${track.title}`);
          const query = `${track.title} ${track.author} audio`;
          const searchResults = await playdl.search(query, { limit: 1 });
          if (searchResults && searchResults.length > 0) {
            url = searchResults[0].url;
            logger.info(`[play-dl] Bridged to YouTube: ${url}`);
          } else {
            logger.warn(`[play-dl] Could not find a bridge for ${track.title}`);
            return null; // Fallback to normal extractors
          }
        } catch (err) {
          logger.error(`[play-dl] Bridge search failed for ${track.title}: ${err.message}`);
          return null; // Fallback
        }
      } else if (!isYouTubeUrl(url)) {
        // Let extractor handle non-YouTube streams (SoundCloud, etc.)
        return null;
      }

      try {
        logger.info(`[play-dl] Fetching stream for: ${track.title}`);
        const stream = await playdl.stream(url, {
          quality: 2,         // 0=low, 1=medium, 2=high
          discordPlayerCompatibility: true
        });
        logger.info(`[play-dl] Stream type: ${stream.type} — starting playback`);
        return stream.stream;
      } catch (err) {
        logger.error(`[play-dl] Failed to get stream for "${track.title}": ${err.message}`);
        // Return null to fall back to extractor
        return null;
      }
    }
  });

  // 1. Load default extractors — handles search for Spotify, Apple Music, SoundCloud, etc.
  await player.extractors.loadMulti(DefaultExtractors);

  // 2. Register YoutubeiExtractor for YouTube search + as streaming fallback.
  //    The search functionality is what we need from youtubei — actual streaming
  //    is handled by play-dl via onBeforeCreateStream above.
  await player.extractors.register(YoutubeiExtractor, {
    streamOptions: {
      // TV_EMBEDDED as fallback if play-dl fails — no cipher needed, stable client
      useClient: 'TV_EMBEDDED'
    }
  });

  logger.info('Music extractors loaded: DefaultExtractors + YoutubeiExtractor | Stream backend: play-dl');

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

  if (process.env.NODE_ENV === 'development') {
    player.events.on('debug', (queue, message) => {
      logger.info(`[Player Debug] ${message}`);
    });
  }

  logger.info('Music player initialized successfully.');
}
