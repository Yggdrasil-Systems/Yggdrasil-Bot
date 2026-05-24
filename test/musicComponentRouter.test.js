import assert from 'node:assert/strict';
import { test, before } from 'node:test';

import { player, initializePlayer } from '../src/services/musicService.js';
import { handleComponentInteraction } from '../src/middleware/commandRouter.js';
import { buildMusicFallbackComponents, resolveQuery } from '../src/utils/components.js';

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

test('handleComponentInteraction handles msf_ fallback search buttons', async () => {
  // Build a real fallback button set to get the correct custom ID format
  const components = buildMusicFallbackComponents('test query');
  const ytButton = components[0].components[2]; // YouTube button
  
  // Verify the custom ID is in the new msf_ format
  assert.ok(ytButton.data.custom_id.startsWith('msf_yt_'), `Expected msf_yt_ prefix, got: ${ytButton.data.custom_id}`);
  
  // Verify resolveQuery round-trips the query
  const queryKey = ytButton.data.custom_id.replace('msf_yt_', '');
  const resolvedQuery = resolveQuery(queryKey);
  assert.equal(resolvedQuery, 'test query');
  
  // Verify the handler recognizes the button (deferUpdate is called)
  let deferCalled = false;
  const interaction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    customId: ytButton.data.custom_id,
    guildId: 'guild-1',
    channel: {},
    member: { voice: { channel: null } }, // No voice channel — will trigger error
    user: { id: '1', username: 'test' },
    reply: async () => {},
    deferUpdate: async () => { deferCalled = true; },
    followUp: async (payload) => {
      // Should get a "Voice Channel Required" error embed since member has no voice channel
      assert.ok(payload.embeds, 'Expected embeds in followUp');
    }
  };

  await handleComponentInteraction(interaction);
  assert.ok(deferCalled, 'Expected deferUpdate to be called for msf_ buttons');
});

test('handleComponentInteraction handles music action buttons without active session', async () => {
  const interaction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    customId: 'music_pause',
    guildId: 'guild-no-queue',
    deferUpdate: async () => {},
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

  // Should return undefined without throwing
  const result = await handleComponentInteraction(interaction);
  assert.equal(result, undefined);
});
