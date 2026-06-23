import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Collection } from 'discord.js';

import { handleMusicChannelMessage } from '../src/services/musicChannelService.js';

test('handleMusicChannelMessage delegates music-channel messages to play with no-prefix context', async () => {
  let deleted = false;
  let context;

  const commands = new Collection();
  commands.set('play', {
    name: 'play',
    aliases: ['p'],
    executeMessage: async (receivedContext) => {
      context = receivedContext;
    }
  });

  const handled = await handleMusicChannelMessage({
    content: '  Night Changes One Direction  ',
    author: { id: 'user-1' },
    member: { id: 'member-1' },
    guild: { id: 'guild-1' },
    channel: { id: 'music-channel' },
    client: {},
    reply: async () => {}
  }, {
    commands,
    settingsService: {
      getEffectiveSettings: async () => ({ musicChannelId: 'music-channel' })
    },
    appContext: { runtimeConfig: { botOwnerId: 'owner' } },
    scheduleDeletion: () => {
      deleted = true;
    }
  });

  assert.equal(handled, true);
  assert.equal(deleted, true);
  assert.equal(context.mode, 'no-prefix');
  assert.equal(context.commandName, 'play');
  assert.deepEqual(context.args, ['Night', 'Changes', 'One', 'Direction']);
});

test('handleMusicChannelMessage ignores messages outside the configured music channel', async () => {
  const handled = await handleMusicChannelMessage({
    content: 'hello',
    author: { id: 'user-1' },
    guild: { id: 'guild-1' },
    channel: { id: 'general' },
    client: {},
    reply: async () => {}
  }, {
    commands: new Collection([['play', { name: 'play', executeMessage: async () => {} }]]),
    settingsService: {
      getEffectiveSettings: async () => ({ musicChannelId: 'music-channel' })
    }
  });

  assert.equal(handled, false);
});
