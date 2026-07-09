import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleSettingsButtonInteraction } from '../src/interactions/settingsButtonInteractionHandler.js';

function createQueue(overrides = {}) {
  return {
    currentTrack: { title: 'Track One' },
    repeatMode: 0,
    node: { volume: 80 },
    setRepeatMode(mode) {
      this.repeatMode = mode;
    },
    ...overrides
  };
}

test('settings_loop_off sets repeat mode to 0 and updates the message', async () => {
  let payload;
  const queue = createQueue({ repeatMode: 2 });

  const handled = await handleSettingsButtonInteraction(
    {
      isButton: () => true,
      customId: 'settings_loop_off',
      guildId: 'guild-1',
      deferUpdate: async () => {},
      editReply: async (response) => {
        payload = response;
      }
    },
    { resolveQueue: () => queue }
  );

  assert.equal(handled, true);
  assert.equal(queue.repeatMode, 0);
  assert.ok(payload.embeds);
  assert.ok(payload.components);
});

test('settings_loop_track sets repeat mode to 1', async () => {
  const queue = createQueue({ repeatMode: 0 });

  const handled = await handleSettingsButtonInteraction(
    {
      isButton: () => true,
      customId: 'settings_loop_track',
      guildId: 'guild-1',
      deferUpdate: async () => {},
      editReply: async () => {}
    },
    { resolveQueue: () => queue }
  );

  assert.equal(handled, true);
  assert.equal(queue.repeatMode, 1);
});

test('settings_loop_queue sets repeat mode to 2', async () => {
  const queue = createQueue({ repeatMode: 0 });

  const handled = await handleSettingsButtonInteraction(
    {
      isButton: () => true,
      customId: 'settings_loop_queue',
      guildId: 'guild-1',
      deferUpdate: async () => {},
      editReply: async () => {}
    },
    { resolveQueue: () => queue }
  );

  assert.equal(handled, true);
  assert.equal(queue.repeatMode, 2);
});

test('settings_autoplay toggles repeat mode 3 on', async () => {
  const queue = createQueue({ repeatMode: 0 });

  const handled = await handleSettingsButtonInteraction(
    {
      isButton: () => true,
      customId: 'settings_autoplay',
      guildId: 'guild-1',
      deferUpdate: async () => {},
      editReply: async () => {}
    },
    { resolveQueue: () => queue }
  );

  assert.equal(handled, true);
  assert.equal(queue.repeatMode, 3);
});

test('settings_autoplay toggles repeat mode 3 off', async () => {
  const queue = createQueue({ repeatMode: 3 });

  const handled = await handleSettingsButtonInteraction(
    {
      isButton: () => true,
      customId: 'settings_autoplay',
      guildId: 'guild-1',
      deferUpdate: async () => {},
      editReply: async () => {}
    },
    { resolveQueue: () => queue }
  );

  assert.equal(handled, true);
  assert.equal(queue.repeatMode, 0);
});

test('settings_filters opens filter panel as ephemeral reply', async () => {
  let payload;
  const queue = createQueue();

  const handled = await handleSettingsButtonInteraction(
    {
      isButton: () => true,
      customId: 'settings_filters',
      guildId: 'guild-1',
      reply: async (response) => {
        payload = response;
      }
    },
    { resolveQueue: () => queue }
  );

  assert.equal(handled, true);
  assert.equal(payload.flags, 64);
  assert.ok(payload.components.length > 0);
  assert.match(payload.embeds[0].data.title, /Filters/i);
});

test('settings button handler replies with error when no queue', async () => {
  let errorPayload;

  const handled = await handleSettingsButtonInteraction(
    {
      isButton: () => true,
      customId: 'settings_loop_off',
      guildId: 'guild-1',
      reply: async (response) => {
        errorPayload = response;
      }
    },
    { resolveQueue: () => null }
  );

  assert.equal(handled, true);
  assert.match(errorPayload.embeds[0].data.title, /No Active Session/i);
});

test('settings button handler ignores non-button interactions', async () => {
  const handled = await handleSettingsButtonInteraction({
    isButton: () => false,
    customId: 'settings_loop_off'
  });

  assert.equal(handled, false);
});

test('settings button handler ignores unrelated custom ids', async () => {
  const handled = await handleSettingsButtonInteraction({
    isButton: () => true,
    customId: 'music_pause'
  });

  assert.equal(handled, false);
});
