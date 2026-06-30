import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleMusicFilterInteraction } from '../src/interactions/musicFilterInteractionHandler.js';

function createQueue(overrides = {}) {
  return {
    currentTrack: { title: 'Track One' },
    node: { volume: 80 },
    filters: {
      ffmpeg: {
        filters: [],
        setInputArgs: async () => {},
        setFilters: async () => {},
        toggle: async () => {}
      }
    },
    ...overrides
  };
}

test('music filter interaction clears all filters', async () => {
  let payload;
  let cleared = false;
  let deferred = false;

  const handled = await handleMusicFilterInteraction({
    isButton: () => true,
    customId: 'filter_clear',
    guildId: 'guild-1',
    deferUpdate: async () => {
      deferred = true;
    },
    editReply: async (response) => {
      payload = response;
    }
  }, {
    resolveQueue: () => createQueue({
      filters: {
        ffmpeg: {
          filters: [],
          setFilters: async () => {
            cleared = true;
          },
          toggle: async () => {}
        }
      }
    })
  });

  assert.equal(handled, true);
  assert.equal(deferred, true);
  assert.equal(cleared, true);
  assert.match(payload.embeds[0].data.title, /Filters Cleared/i);
});

test('music filter interaction toggles supported filters', async () => {
  let toggled;
  let payload;
  let deferred = false;

  const handled = await handleMusicFilterInteraction({
    isButton: () => true,
    customId: 'filter_bassboost',
    guildId: 'guild-1',
    deferUpdate: async () => {
      deferred = true;
    },
    editReply: async (response) => {
      payload = response;
    }
  }, {
    resolveQueue: () => createQueue({
      filters: {
        ffmpeg: {
          filters: [],
          setInputArgs: async () => {},
          toggle: async ([name]) => {
            toggled = name;
          }
        }
      }
    })
  });

  assert.equal(handled, true);
  assert.equal(deferred, true);
  assert.equal(toggled, 'bassboost');
  assert.match(payload.embeds[0].data.title, /Bass Boost/i);
});

test('music filter interaction ignores unsupported filter ids', async () => {
  const handled = await handleMusicFilterInteraction({
    isButton: () => true,
    customId: 'filter_unknown',
    guildId: 'guild-1',
    reply: async () => {
      throw new Error('should not reply');
    },
    deferUpdate: async () => {
      throw new Error('should not defer');
    },
    editReply: async () => {
      throw new Error('should not editReply');
    }
  }, {
    resolveQueue: () => createQueue()
  });

  assert.equal(handled, false);
});

test('music filter interaction replies with error when no queue', async () => {
  let errorPayload;

  const handled = await handleMusicFilterInteraction({
    isButton: () => true,
    customId: 'filter_bassboost',
    guildId: 'guild-1',
    reply: async (response) => {
      errorPayload = response;
    }
  }, {
    resolveQueue: () => null
  });

  assert.equal(handled, true);
  assert.match(errorPayload.embeds[0].data.title, /No Active Session/i);
});
