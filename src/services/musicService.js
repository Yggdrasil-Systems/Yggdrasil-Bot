import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { buildNowPlayingEmbed, buildSuccessEmbed, buildErrorEmbed, buildNeutralEmbed } from '../utils/embeds.js';
import { buildMusicPlayerComponents } from '../utils/components.js';
import { logger } from '../utils/logger.js';

async function runYoutubeiDiagnostic(track, correlationId) {
  try {
    const { Innertube } = await import('youtubei.js');
    logger.info(`${correlationId} [DEBUG] Running independent youtubei.js diagnostic for track: ${track.title}...`);

    const yt = await Innertube.create({
      generate_session_locally: true,
      client_type: 'IOS',
      generateWithPoToken: true
    });
    logger.info(
      `${correlationId} [DEBUG] Innertube initialized. Client: IOS. PoToken attached: ${!!yt.session.po_token}`
    );

    const search = await yt.search(track.title + ' ' + track.author, { type: 'video' });
    const videoId = search.results?.[0]?.id;
    if (!videoId) {
      logger.error(`${correlationId} [DEBUG] Standalone search found no results.`);
      return;
    }

    logger.info(`${correlationId} [DEBUG] Standalone search successful. Video ID: ${videoId}`);
    const info = await yt.getBasicInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

    logger.info(`${correlationId} [DEBUG] Format selected. Attempting decipher...`);
    const decipheredUrl = await format.decipher(yt.session.player);
    logger.info(`${correlationId} [DEBUG] Decipher successful. URL length: ${decipheredUrl?.length}`);
  } catch (err) {
    logger.error(`${correlationId} [DEBUG] youtubei.js standalone diagnostic FAILED:`, {
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err
    });
  }
}

// ─── Safe channel sender ────────────────────────────────────────────────────

function safeSend(queue, payload) {
  try {
    const channel = queue?.metadata?.channel;
    if (channel?.send) {
      channel.send(payload).catch((err) => {
        logger.warn('Failed to send music event message.', err);
      });
    }
  } catch (err) {
    logger.error('Unexpected error in safeSend.', err);
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

function formatPlaybackError(error, maxLength = 200) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

  return message.slice(0, maxLength);
}

// ─── Player initialization ──────────────────────────────────────────────────

export async function initializePlayer(client, playerService) {
  const player = playerService.setPlayer(
    new Player(client, {
      skipFFmpeg: false
    })
  );

  // 1. Load default extractors (SoundCloud, Spotify metadata, Apple metadata, etc.)
  try {
    await player.extractors.loadMulti(DefaultExtractors);
  } catch (err) {
    logger.error('Failed to load DefaultExtractors. Some sources may be unavailable.', err);
  }

  // 2. Register the YouTubei extractor — this is the critical streaming bridge
  //    Spotify/Apple tracks resolve metadata then bridge through YouTube for audio
  //    IOS client is the only one that reliably produces direct stream URLs
  //    (ANDROID returns HTTP 400, ANDROID_MUSIC is invalid, TV_EMBEDDED is blocked)
  try {
    await player.extractors.register(YoutubeiExtractor, {
      streamOptions: {
        useClient: 'IOS',
        generateWithPoToken: true
      }
    });
    logger.info('Music extractors loaded: DefaultExtractors + YoutubeiExtractor');
  } catch (err) {
    logger.error('Failed to register YoutubeiExtractor. Music playback will be unavailable.', err);
  }
  // ─── Player Events ──────────────────────────────────────────────────────

  player.events.on('debug', (queue, message) => {
    if (process.env.MUSIC_DEBUG === 'true') {
      const correlationId = queue?.metadata?.correlationId || '[MUSIC:SYS]';
      logger.info(`${correlationId} [discord-player debug]: ${message}`);
    }
  });

  player.events.on('playerStart', (queue, track) => {
    const correlationId = queue?.metadata?.correlationId || '[MUSIC:SYS]';
    if (process.env.MUSIC_DEBUG === 'true') {
      logger.info(`${correlationId} Playback started for track: ${track.title} [${track.url}]`);
    }
    const emoji = getSourceEmoji(track);
    safeSend(queue, {
      embeds: [buildNowPlayingEmbed(track, queue)],
      components: buildMusicPlayerComponents()
    });
    logger.info(`Now playing: ${emoji} ${track.title} — ${track.author} [${getSourceLabel(track)}]`);
  });

  player.events.on('playerError', (queue, error, track) => {
    const correlationId = queue?.metadata?.correlationId || '[MUSIC:SYS]';
    if (process.env.MUSIC_DEBUG === 'true') {
      logger.error(`${correlationId} playerError event emitted for track ${track?.title || 'unknown'}`, {
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          MUSIC_DEBUG: process.env.MUSIC_DEBUG
        }
      });
    }
    const trackInfo = track ? `**${track.title}**` : 'the current track';
    logger.error(`Player track error on ${trackInfo}.`, error);

    if (process.env.MUSIC_DEBUG === 'true' && track) {
      runYoutubeiDiagnostic(track, correlationId);
    }
  });

  player.events.on('audioTrackAdd', (queue, track) => {
    // Only notify if something is already playing (playerStart handles the first track)
    if (queue.isPlaying()) {
      const emoji = getSourceEmoji(track);
      safeSend(queue, {
        embeds: [
          buildSuccessEmbed(
            `${emoji} Track Queued`,
            `**[${track.title}](${track.url})**\nby **${track.author}** · \`${track.duration}\`\n\n📍 Position in queue: **#${queue.tracks.data.length}**`
          )
        ]
      });
    }
  });

  player.events.on('audioTracksAdd', (queue, tracks) => {
    safeSend(queue, {
      embeds: [buildSuccessEmbed('📋 Tracks Queued', `Added **${tracks.length}** tracks to the queue.`)]
    });
  });

  player.events.on('playerSkip', (queue, track) => {
    logger.warn(`Skipped unplayable track: ${track.title} — ${track.author}`);
    safeSend(queue, {
      embeds: [
        buildErrorEmbed(
          'Track Skipped',
          `Could not play **${track.title}**. Skipping to next track.\nThis can happen with age-restricted or region-locked content.`
        )
      ]
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
    logger.error('Player error.', error);
    safeSend(queue, {
      embeds: [
        buildErrorEmbed(
          'Playback Error',
          `Something went wrong during playback.\n\`\`\`${formatPlaybackError(error)}\`\`\``
        )
      ]
    });
  });

  player.events.on('playerError', (queue, error, track) => {
    const trackInfo = track ? `**${track.title}**` : 'the current track';
    logger.error(`Player track error on ${trackInfo}.`, error);
    safeSend(queue, {
      embeds: [
        buildErrorEmbed(
          'Track Error',
          `Failed to stream ${trackInfo}.\n\`\`\`${formatPlaybackError(error)}\`\`\`\nTry playing it again or use a different source.`
        )
      ]
    });
  });

  // Debug logging — logger.debug is silenced in production automatically
  player.events.on('debug', (queue, message) => {
    logger.debug(`[Player] ${message}`);
  });

  player.extractors.on('error', (_context, extractor, error) => {
    logger.error(`Music extractor error: ${extractor?.identifier ?? 'unknown'}`, error);
  });

  // Load extractors only after error listeners are attached: some providers
  // emit startup failures while probing their remote backends.
  try {
    await player.extractors.loadMulti(DefaultExtractors);
  } catch (err) {
    logger.error('Failed to load default music extractors. Some sources may be unavailable.', err);
  }

  logger.info('Music player initialized successfully.');
}
