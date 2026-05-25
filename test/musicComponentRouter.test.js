import assert from 'node:assert/strict';
import { test, before } from 'node:test';

import { player, initializePlayer } from '../src/services/musicService.js';
import { handleComponentInteraction } from '../src/middleware/commandRouter.js';

before(async () => {
  if (!player) {
    const mockClient = {
      options: {},
      on: () => {},
      incrementMaxListeners: () => {},
      guilds: { resolveId: (id) => id }
    };
    await initializePlayer(mockClient);
  }
});

test('handleComponentInteraction handles music_pause without active session', async () => {
  const interaction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    customId: 'music_pause',
    guildId: 'guild-no-queue',
    reply: async (payload) => {
      assert.equal(payload.embeds[0].data.title, '❌ No Active Session');
    }
  };

  await handleComponentInteraction(interaction);
});

test('handleComponentInteraction handles music_resume without active session', async () => {
  const interaction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    customId: 'music_resume',
    guildId: 'guild-no-queue',
    reply: async (payload) => {
      assert.equal(payload.embeds[0].data.title, '❌ No Active Session');
    }
  };

  await handleComponentInteraction(interaction);
});

test('handleComponentInteraction handles music_settings without active session', async () => {
  const interaction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    customId: 'music_settings',
    guildId: 'guild-no-queue',
    reply: async (payload) => {
      assert.equal(payload.embeds[0].data.title, '❌ No Active Session');
    }
  };

  await handleComponentInteraction(interaction);
});

test('handleComponentInteraction ignores non-button non-select interactions', async () => {
  const interaction = {
    isButton: () => false,
    isStringSelectMenu: () => false,
    customId: 'something_else'
  };

  const result = await handleComponentInteraction(interaction);
  assert.equal(result, undefined);
});

test('handleComponentInteraction handles ping_refresh button', async () => {
  let updateCalled = false;
  const interaction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    customId: 'ping_refresh',
    client: {
      ws: { ping: 42 },
      user: { displayAvatarURL: () => 'https://example.com/avatar.png', id: '1', tag: 'Bot#0001' },
      guilds: { cache: new Map([['1', { memberCount: 10 }]]) },
      channels: { cache: new Map() }
    },
    user: { displayName: 'TestUser', username: 'testuser' },
    update: async (payload) => {
      updateCalled = true;
      assert.ok(payload.embeds[0], 'Expected embed in update');
    }
  };

  await handleComponentInteraction(interaction);
  assert.ok(updateCalled, 'Expected update to be called for ping_refresh');
});
