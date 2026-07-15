import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { buildNowPlayingEmbed, buildSuccessEmbed, buildErrorEmbed, buildNeutralEmbed } from '../utils/embeds.js';
import { buildMusicPlayerComponents } from '../utils/components.js';
import { logger } from '../utils/logger.js';

// ─── MUSIC_DEBUG helpers ────────────────────────────────────────────────────

const isDebug = () => process.env.MUSIC_DEBUG === 'true';

function dbg(queue, msg) {
  if (!isDebug()) return;
  const cid = queue?.metadata?.correlationId || '[MUSIC:SYS]';
  const t0 = queue?.metadata?.playbackStartedAt;
  const offset = t0 ? `+${Date.now() - t0}ms` : '+?ms';
  logger.info(`${cid} ${offset} ${msg}`);
}

function dbgErr(queue, msg, error) {
  if (!isDebug()) return;
  const cid = queue?.metadata?.correlationId || '[MUSIC:SYS]';
  const t0 = queue?.metadata?.playbackStartedAt;
  const offset = t0 ? `+${Date.now() - t0}ms` : '+?ms';
  logger.error(`${cid} ${offset} ${msg}`, {
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
  });
}

// ─── Standalone youtubei.js diagnostic (runs on playerError) ────────────────

async function runYoutubeiDiagnostic(track, queue) {
  try {
    const { Innertube } = await import('youtubei.js');
    dbg(queue, `[DIAG] Running independent youtubei.js diagnostic for track: ${track.title}...`);

    const yt = await Innertube.create({
      generate_session_locally: true,
      client_type: 'IOS',
      generateWithPoToken: true
    });
    dbg(queue, `[DIAG] Innertube initialized. Client: IOS. PoToken attached: ${!!yt.session.po_token}`);

    const search = await yt.search(track.title + ' ' + track.author, { type: 'video' });
    const videoId = search.results?.[0]?.id;
    if (!videoId) {
      dbg(queue, '[DIAG] Standalone search found no results.');
      return;
    }

    dbg(queue, `[DIAG] Standalone search successful. Video ID: ${videoId}`);
    const info = await yt.getBasicInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

    dbg(queue, '[DIAG] Format selected. Attempting decipher...');
    const decipheredUrl = await format.decipher(yt.session.player);
    dbg(queue, `[DIAG] Decipher successful. URL length: ${decipheredUrl?.length}`);
  } catch (err) {
    dbgErr(queue, '[DIAG] youtubei.js standalone diagnostic FAILED:', err);
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

// ─── Phase 2: Deep pipeline instrumentation (MUSIC_DEBUG only) ──────────────

function instrumentDispatcher(queue) {
  if (!isDebug()) return;
  const dispatcher = queue.dispatcher;
  if (!dispatcher) return;

  dbg(queue, 'Instrumenting dispatcher: VoiceConnection + AudioPlayer + Networking');

  // ── VoiceConnection state transitions ──
  let currentNetworking = null;

  dispatcher.voiceConnection.on('stateChange', (oldState, newState) => {
    dbg(queue, `VoiceConnection: ${oldState.status} -> ${newState.status}`);

    if (newState.status === 'signalling' || newState.status === 'disconnected') {
      dbg(queue, `VoiceConnection close detail: reason="${newState.reason}" ws_close_num=${newState.closeCode} rejoinAttempts=${dispatcher.voiceConnection.rejoinAttempts}`);
    }

    // Re-instrument Networking when it changes
    const networking = newState.networking;
    if (networking && networking !== currentNetworking) {
      currentNetworking = networking;
      dbg(queue, 'Networking object changed, attaching listeners');
      networking.on('stateChange', (oldNS, newNS) => {
        dbg(queue, `Networking: ${oldNS.code} -> ${newNS.code}`);
      });
      networking.on('error', (err) => {
        dbgErr(queue, 'Networking error:', err);
      });
      networking.on('close', (code) => {
        dbg(queue, `Networking close: ws_close_num=${code}`);
      });
      networking.on('debug', (msg) => {
        dbg(queue, `Networking debug: ${msg}`);
      });
    }
  });

  dispatcher.voiceConnection.on('error', (err) => {
    dbgErr(queue, 'VoiceConnection error:', err);
  });

  dispatcher.voiceConnection.on('debug', (msg) => {
    dbg(queue, `VoiceConnection debug: ${msg}`);
  });

  // ── AudioPlayer state transitions ──
  dispatcher.audioPlayer.on('stateChange', (oldState, newState) => {
    dbg(queue, `AudioPlayer: ${oldState.status} -> ${newState.status}`);

    // When transitioning to buffering, instrument the AudioResource
    if (newState.status === 'buffering' && newState.resource) {
      instrumentAudioResource(queue, newState.resource);
    }
  });

  dispatcher.audioPlayer.on('error', (error) => {
    dbgErr(queue, `AudioPlayer error: ${error.message}`, error);
    if (error.resource) {
      dbg(
        queue,
        `AudioPlayer error resource: started=${error.resource.started}, ended=${error.resource.ended}, playbackDuration=${error.resource.playbackDuration}ms`
      );
    }
  });
}

function instrumentAudioResource(queue, resource) {
  if (!isDebug()) return;

  dbg(
    queue,
    `AudioResource created: started=${resource.started}, ended=${resource.ended}, silencePaddingFrames=${resource.silencePaddingFrames}, playStream type=${resource.playStream?.constructor?.name}`
  );

  // ── playStream (Readable) lifecycle ──
  const ps = resource.playStream;
  if (ps) {
    ps.on('error', (err) => {
      dbgErr(queue, 'playStream error:', err);
    });
    ps.on('close', () => {
      dbg(
        queue,
        `playStream close: playbackDuration=${resource.playbackDuration}ms, started=${resource.started}, ended=${resource.ended}`
      );
    });
    ps.on('end', () => {
      dbg(queue, `playStream end: playbackDuration=${resource.playbackDuration}ms`);
    });

    // ── FFmpeg process instrumentation ──
    // If the playStream is an FFmpeg Duplex, it has a .process (ChildProcess) property
    if (ps.process) {
      dbg(queue, `FFmpeg process detected (pid=${ps.process.pid})`);
      ps.process.on('exit', (code, signal) => {
        dbg(queue, `FFmpeg exit: code=${code}, signal=${signal}`);
      });
      if (ps.process.stderr) {
        ps.process.stderr.on('data', (chunk) => {
          dbg(queue, `FFmpeg stderr: ${chunk.toString().trim()}`);
        });
      }
    }
  }
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

  // Single debug listener — MUSIC_DEBUG gets verbose info, production gets logger.debug
  player.events.on('debug', (queue, message) => {
    if (isDebug()) {
      dbg(queue, `[discord-player] ${message}`);
    }
    logger.debug(`[Player] ${message}`);
  });

  // ── Connection created: attach deep instrumentation ONCE ──
  player.events.on('connection', (queue) => {
    dbg(queue, 'connection event: dispatcher created');
    instrumentDispatcher(queue);
  });

  client.on('raw', (packet) => {
    if (isDebug() && packet.t === 'VOICE_SERVER_UPDATE') {
      const guildId = packet.d?.guild_id;
      const queue = player.nodes.get(guildId);
      if (queue) {
        dbg(queue, `[WS] Raw VOICE_SERVER_UPDATE received: endpoint=${packet.d?.endpoint} token_present=${!!packet.d?.token}`);
      }
    }
  });

  // ── connectionDestroyed: detect premature teardown ──
  player.events.on('connectionDestroyed', (queue) => {
    dbg(queue, 'connectionDestroyed event: VoiceConnection was destroyed');
  });

  // ── willPlayTrack: confirm stream config before dispatch ──
  player.events.on('willPlayTrack', (queue, track, config, done) => {
    dbg(
      queue,
      `willPlayTrack: "${track.title}" source=${track.source} queryType=${track.queryType} skipFFmpeg=${config?.dispatcherConfig?.skipFFmpeg} streamType=${config?.dispatcherConfig?.type}`
    );
    // Signal that we are done (no modifications to config)
    done();
  });

  // ── playerTrigger: confirms the player actually received the track ──
  player.events.on('playerTrigger', (queue, track, reason) => {
    dbg(queue, `playerTrigger: "${track.title}" reason=${reason}`);
  });

  // ── playerStart: now playing ──
  player.events.on('playerStart', (queue, track) => {
    dbg(queue, `playerStart: "${track.title}" [${track.url}]`);

    if (isDebug()) {
      // Log environment once per playback
      dbg(queue, `Environment: node=${process.version} platform=${process.platform} arch=${process.arch}`);
    }

    const emoji = getSourceEmoji(track);
    safeSend(queue, {
      embeds: [buildNowPlayingEmbed(track, queue)],
      components: buildMusicPlayerComponents()
    });
    logger.info(`Now playing: ${emoji} ${track.title} — ${track.author} [${getSourceLabel(track)}]`);
  });

  // ── playerFinish: confirms whether playback completed normally ──
  player.events.on('playerFinish', (queue, track) => {
    dbg(queue, `playerFinish: "${track?.title || 'unknown'}"`);
  });

  // ── playerError: single handler for both logging and user notification ──
  player.events.on('playerError', (queue, error, track) => {
    const trackInfo = track ? `**${track.title}**` : 'the current track';
    dbgErr(queue, `playerError: track="${track?.title || 'unknown'}"`, error);
    logger.error(`Player track error on ${trackInfo}.`, error);

    safeSend(queue, {
      embeds: [
        buildErrorEmbed(
          'Track Error',
          `Failed to stream ${trackInfo}.\n\`\`\`${formatPlaybackError(error)}\`\`\`\nTry playing it again or use a different source.`
        )
      ]
    });

    if (isDebug() && track) {
      runYoutubeiDiagnostic(track, queue);
    }
  });

  // ── playerSkip: track skipped due to extraction failure ──
  player.events.on('playerSkip', (queue, track) => {
    dbg(queue, `playerSkip: "${track.title}" — this is the "error swallowed" path`);
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

  player.events.on('disconnect', (queue) => {
    dbg(queue, 'disconnect event: bot left the voice channel');
    safeSend(queue, {
      embeds: [buildNeutralEmbed('Disconnected', 'Left the voice channel. See you next time! 👋')]
    });
  });

  player.events.on('emptyChannel', (queue) => {
    dbg(queue, 'emptyChannel event');
    if (!queue.metadata?.is247) {
      safeSend(queue, {
        embeds: [buildNeutralEmbed('Empty Channel', 'Everyone left the voice channel. Disconnecting...')]
      });
    }
  });

  player.events.on('emptyQueue', (queue) => {
    dbg(queue, 'emptyQueue event');
    if (!queue.metadata?.is247) {
      safeSend(queue, {
        embeds: [buildNeutralEmbed('Queue Finished', 'No more tracks in the queue. Add more with `tree play`!')]
      });
    }
  });

  // ── error: GuildQueue-level errors bubbled from StreamDispatcher ──
  player.events.on('error', (queue, error) => {
    dbgErr(queue, 'GuildQueue error event:', error);
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

  player.extractors.on('error', (_context, extractor, error) => {
    logger.error(`Music extractor error: ${extractor?.identifier ?? 'unknown'}`, error);
  });

  logger.info('Music player initialized successfully.');
}
