import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handlePingRefreshInteraction } from '../src/interactions/pingInteractionHandler.js';

test('ping refresh interaction updates the embed for the requester', async () => {
  let updatePayload;

  const handled = await handlePingRefreshInteraction({
    isButton: () => true,
    customId: 'ping_refresh',
    client: {
      ws: { ping: 42 },
      user: {
        id: 'bot-1',
        tag: 'World Tree#0001',
        displayAvatarURL: () => 'https://cdn.example/avatar.png'
      },
      guilds: { cache: new Map([['guild-1', { memberCount: 12 }]]) },
      channels: { cache: new Map([['channel-1', {}]]) }
    },
    user: { displayName: 'Harshit', username: 'harshit' },
    update: async (payload) => {
      updatePayload = payload;
    }
  });

  assert.equal(handled, true);
  assert.match(updatePayload.embeds[0].data.title, /Pong/i);
  assert.match(updatePayload.embeds[0].data.fields[0].value, /42ms/i);
});

test('ping refresh interaction ignores unrelated custom ids', async () => {
  const handled = await handlePingRefreshInteraction({
    isButton: () => true,
    customId: 'music_pause',
    update: async () => {
      throw new Error('should not update');
    }
  });

  assert.equal(handled, false);
});
