import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleSearchSelect, execute } from '../src/commands/music/search.js';

test('search owner can select a cached result', async () => {
  const cacheKey = 'search_select_owner:selection';
  const cache = new Map([
    [cacheKey, { userId: 'owner', tracks: [{ url: 'https://example.com/track' }], textChannel: {}, playerService: {} }]
  ]);
  let playArgs;

  await handleSearchSelect(
    {
      customId: cacheKey,
      user: { id: 'owner' },
      member: { voice: { channel: {} } },
      values: ['0'],
      deferUpdate: async () => {},
      followUp: async () => {}
    },
    {
      cache,
      play: async (...args) => {
        playArgs = args;
      }
    }
  );

  assert.equal(cache.has(cacheKey), false);
  assert.equal(playArgs[0], 'https://example.com/track');
});

test('search selection rejects a user who does not own the cached result without changing the queue', async () => {
  const cacheKey = 'search_select_owner:selection';
  const queue = [{ title: 'Current track' }];
  const cache = new Map([
    [cacheKey, { userId: 'owner', tracks: [{ url: 'https://example.com/track' }], textChannel: {}, playerService: {} }]
  ]);
  let reply;
  let playCalls = 0;

  await handleSearchSelect(
    {
      customId: cacheKey,
      user: { id: 'other-user' },
      member: { voice: { channel: {} } },
      values: ['0'],
      deferUpdate: async () => {},
      followUp: async (payload) => {
        reply = payload;
      }
    },
    {
      cache,
      play: async () => {
        playCalls += 1;
        queue.push({ title: 'Unauthorized track' });
      }
    }
  );

  assert.match(reply.embeds[0].data.title, /Not Your Search/);
  assert.equal(playCalls, 0);
  assert.deepEqual(queue, [{ title: 'Current track' }]);
  assert.equal(cache.has(cacheKey), true);
});

test('search defers slash responses without duplicate deferral', async () => {
  let deferred = false;
  let response;

  await execute({
    options: { getString: () => 'song' },
    member: { voice: { channel: { guild: { id: 'guild-1' } } } },
    channel: {},
    user: { id: 'user-1' },
    appContext: {
      playerService: {
        getPlayer: () => ({
          search: async () => {
            return { hasTracks: () => false }; // trigger no results
          }
        })
      }
    },
    deferReply: async () => {
      if (deferred) throw new Error('InteractionAlreadyReplied');
      deferred = true;
    },
    editReply: async (payload) => {
      response = payload;
    }
  });

  assert.equal(deferred, true);
  assert.match(response.embeds[0].data.title, /No Results/);
});
