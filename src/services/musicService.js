import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { buildNowPlayingEmbed, buildSuccessEmbed, buildErrorEmbed, buildNeutralEmbed } from '../utils/embeds.js';
import { buildMusicPlayerComponents } from '../utils/components.js';
import { logger } from '../utils/logger.js';

export let player = null;

function safeSend(queue, payload) {
  try {
    if (queue?.metadata?.channel?.send) {
      queue.metadata.channel.send(payload).catch((err) => {
        logger.error('Failed to send music event message:', err.message);
      });
    } else {
      logger.warn('Queue metadata.channel is missing or has no send method — skipping event message.');
    }
  } catch (err) {
    logger.error('Unexpected error in safeSend:', err.message);
  }
}

export async function initializePlayer(client) {
  player = new Player(client, {
    ytdlOptions: {
      quality: 'highestaudio',
      highWaterMark: 1 << 25
    }
  });

  // Register default extractors (Spotify, Apple, YouTube, etc)
  await player.extractors.loadMulti(DefaultExtractors);

  player.events.on('playerStart', (queue, track) => {
    safeSend(queue, {
      embeds: [buildNowPlayingEmbed(track, queue)],
      components: buildMusicPlayerComponents()
    });
  });

  player.events.on('audioTrackAdd', (queue, track) => {
    // Only send if it's not the first track (playerStart handles the first)
    if (queue.isPlaying()) {
      safeSend(queue, {
        embeds: [buildSuccessEmbed('Track Added', `**${track.title}** by **${track.author}** has been added to the queue!`)]
      });
    }
  });

  player.events.on('disconnect', (queue) => {
    safeSend(queue, {
      embeds: [buildNeutralEmbed('Disconnected', 'Looks like my job here is done, leaving now!')]
    });
  });

  player.events.on('emptyChannel', (queue) => {
    safeSend(queue, {
      embeds: [buildNeutralEmbed('Empty Channel', 'Nobody is in the voice channel, leaving...')]
    });
  });

  player.events.on('emptyQueue', (queue) => {
    // Check if 24/7 mode is enabled on the queue metadata
    if (!queue.metadata?.is247) {
      safeSend(queue, {
        embeds: [buildNeutralEmbed('Queue Finished', 'There are no more tracks to play.')]
      });
    }
  });

  player.events.on('error', (queue, error) => {
    logger.error('Player error:', error);
    safeSend(queue, {
      embeds: [buildErrorEmbed('Playback Error', `An error occurred: ${error.message}`)]
    });
  });

  player.events.on('playerError', (queue, error) => {
    logger.error('Player track error:', error);
    safeSend(queue, {
      embeds: [buildErrorEmbed('Track Error', `Failed to play this track: ${error.message}`)]
    });
  });

  logger.info('Music player initialized with DefaultExtractors.');
}
