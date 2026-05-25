import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import ytDlp from 'yt-dlp-exec';
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
    // to use yt-dlp directly, which:
    //   - bypasses youtube cipher/signature issues natively
    //   - handles VEVO and age-restricted tracks easily
    onBeforeCreateStream: async (track, method, queue) => {
      let url = track.url;
      const source = (track.source || track.raw?.source || '').toLowerCase();
      const needsBridge = ['spotify', 'apple_music', 'apple'].includes(source);

      // If it's a Spotify/Apple track, we tell yt-dlp to search for the audio
      if (needsBridge) {
        url = `ytsearch1:${track.title} ${track.author} audio`;
        logger.info(`[yt-dlp] Bridging ${source} track: ${track.title}`);
      } else if (!isYouTubeUrl(url)) {
        // Let extractor handle non-YouTube streams (SoundCloud, etc.)
        return null;
      }

      try {
        logger.info(`[yt-dlp] Fetching stream URL for: ${track.title}`);
        const output = await ytDlp.exec(url, {
          dumpSingleJson: true,
          format: 'bestaudio/best',
          noWarnings: true,
          callHome: false,
          preferFreeFormats: true,
          youtubeSkipDashManifest: true
        });
        
        let info;
        try {
            info = JSON.parse(output.stdout);
        } catch (e) {
            throw new Error('Failed to parse yt-dlp output');
        }

        // If it was a search, the actual video info is in entries[0]
        if (info.entries && info.entries.length > 0) {
            info = info.entries[0];
        }

        const streamUrl = info.url || info.formats?.find(f => f.url)?.url;
        if (!streamUrl) {
            throw new Error('Could not extract direct stream URL');
        }

        logger.info(`[yt-dlp] Stream URL extracted successfully`);
        return streamUrl;
      } catch (err) {
        logger.error(`[yt-dlp] Failed to extract stream for "${track.title}": ${err.message}`);
        // Return null to fall back to standard extractors
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

  logger.info('Music extractors loaded: DefaultExtractors + YoutubeiExtractor | Stream backend: yt-dlp');

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
