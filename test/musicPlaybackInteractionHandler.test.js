import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleMusicPlaybackInteraction } from '../src/interactions/musicPlaybackInteractionHandler.js';

function createQueue(overrides = {}) {
  const queue = {
    currentTrack: {
      title: 'Track One',
      url: 'https://example.com/track-one',
      author: 'Artist',
      duration: '3:21',
      requestedBy: { id: 'user-1', displayAvatarURL: () => null }
    },
    repeatMode: 0,
    node: {
      volume: 80,
      isPaused: () => false,
      setPaused: () => {},
      skip: () => {},
      setVolume: () => {},
      createProgressBar: () => '█'
    },
    history: {
      previous: async () => {}
    },
    tracks: {
      data: [
        {
          title: 'Track Two',
          url: 'https://example.com/track-two',
          author: 'Artist',
          duration: '2:58',
          requestedBy: { id: 'user-2' }
        }
      ],
      shuffle: () => {},
      clear: () => {},
      ffmpeg: {
        filters: [],
        setInputArgs: async () => {},
        toggle: async () => {}
      }
    },
    delete: () => {},
    ...overrides
  };

  return queue;
}

function createInteraction(customId, queue, extras = {}) {
  const replies = [];
  return {
    interaction: {
      isButton: () => true,
      customId,
      guildId: 'guild-1',
      reply: async (payload) => {
        replies.push(payload);
      },
      ...extras,
      client: extras.client ?? {}
    },
    replies,
    queue
  };
}

test('music playback interaction pauses active queues', async () => {
  let paused = false;
  const { interaction, replies } = createInteraction(
    'music_pause',
    createQueue({
      node: {
        volume: 80,
        isPaused: () => false,
        setPaused: (value) => {
          paused = value;
        }
      }
    })
  );

  const handled = await handleMusicPlaybackInteraction(interaction, {
    resolveQueue: () =>
      createQueue({
        node: {
          volume: 80,
          isPaused: () => false,
          setPaused: (value) => {
            paused = value;
          }
        }
      })
  });

  assert.equal(handled, true);
  assert.equal(paused, true);
  assert.match(replies[0].embeds[0].data.title, /Paused/i);
});

test('music playback interaction resumes paused queues', async () => {
  let paused = true;
  const { interaction, replies } = createInteraction(
    'music_resume',
    createQueue({
      node: {
        volume: 80,
        isPaused: () => true,
        setPaused: (value) => {
          paused = value;
        }
      }
    })
  );

  const handled = await handleMusicPlaybackInteraction(interaction, {
    resolveQueue: () =>
      createQueue({
        node: {
          volume: 80,
          isPaused: () => true,
          setPaused: (value) => {
            paused = value;
          }
        }
      })
  });

  assert.equal(handled, true);
  assert.equal(paused, false);
  assert.match(replies[0].embeds[0].data.title, /Resumed/i);
});

test('music playback interaction skips the current track', async () => {
  let skipped = false;
  const { interaction, replies } = createInteraction(
    'music_skip',
    createQueue({
      node: {
        volume: 80,
        isPaused: () => false,
        setPaused: () => {},
        skip: () => {
          skipped = true;
        }
      }
    })
  );

  const handled = await handleMusicPlaybackInteraction(interaction, {
    resolveQueue: () =>
      createQueue({
        node: {
          volume: 80,
          isPaused: () => false,
          setPaused: () => {},
          skip: () => {
            skipped = true;
          }
        }
      })
  });

  assert.equal(handled, true);
  assert.equal(skipped, true);
  assert.match(replies[0].embeds[0].data.title, /Skipped/i);
});

test('music playback interaction shows the queue view', async () => {
  let payload;

  const handled = await handleMusicPlaybackInteraction(
    {
      isButton: () => true,
      customId: 'music_queue',
      guildId: 'guild-1',
      reply: async (response) => {
        payload = response;
      }
    },
    {
      resolveQueue: () => createQueue()
    }
  );

  assert.equal(handled, true);
  assert.match(payload.embeds[0].data.title, /Music Queue/i);
  assert.equal(payload.components.length, 1);
});

test('music playback interaction updates volume up and down', async () => {
  const volumes = [];
  const makeQueue = (volume) =>
    createQueue({
      node: {
        volume,
        isPaused: () => false,
        setPaused: () => {},
        setVolume: (nextVolume) => {
          volumes.push(nextVolume);
        }
      }
    });

  const up = await handleMusicPlaybackInteraction(
    {
      isButton: () => true,
      customId: 'music_volup',
      guildId: 'guild-1',
      reply: async () => {}
    },
    {
      resolveQueue: () => makeQueue(80)
    }
  );

  const down = await handleMusicPlaybackInteraction(
    {
      isButton: () => true,
      customId: 'music_voldown',
      guildId: 'guild-1',
      reply: async () => {}
    },
    {
      resolveQueue: () => makeQueue(80)
    }
  );

  assert.equal(up, true);
  assert.equal(down, true);
  assert.deepEqual(volumes, [90, 70]);
});

test('music playback interaction stops playback and clears the queue', async () => {
  let deleted = false;
  let payload;

  const handled = await handleMusicPlaybackInteraction(
    {
      isButton: () => true,
      customId: 'music_stop',
      guildId: 'guild-1',
      reply: async (response) => {
        payload = response;
      }
    },
    {
      resolveQueue: () =>
        createQueue({
          delete: () => {
            deleted = true;
          }
        })
    }
  );

  assert.equal(handled, true);
  assert.equal(deleted, true);
  assert.match(payload.embeds[0].data.title, /Stopped/i);
});

test('music playback interaction handles previous track failures', async () => {
  let payload;

  const handled = await handleMusicPlaybackInteraction(
    {
      isButton: () => true,
      customId: 'music_previous',
      guildId: 'guild-1',
      reply: async (response) => {
        payload = response;
      }
    },
    {
      resolveQueue: () =>
        createQueue({
          history: {
            previous: async () => {
              throw new Error('No previous');
            }
          }
        })
    }
  );

  assert.equal(handled, true);
  assert.match(payload.embeds[0].data.title, /No Previous Track/i);
});
