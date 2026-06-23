import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleSearchSelectInteraction } from '../src/interactions/searchInteractionHandler.js';
import { handleQueueClearInteraction } from '../src/interactions/queueInteractionHandler.js';
import { handleMusicSettingsInteraction } from '../src/interactions/musicSettingsInteractionHandler.js';

test('search select interaction delegates valid selections to the provided handler', async () => {
  let deferCalled = false;
  let selected = false;

  const handled = await handleSearchSelectInteraction({
    isStringSelectMenu: () => true,
    customId: 'search_select_user-1',
    user: { id: 'user-1' },
    deferUpdate: async () => {
      deferCalled = true;
    }
  }, {
    onSelect: async () => {
      selected = true;
    }
  });

  assert.equal(handled, true);
  assert.equal(deferCalled, true);
  assert.equal(selected, true);
});

test('search select interaction rejects mismatched users', async () => {
  const replies = [];

  const handled = await handleSearchSelectInteraction({
    isStringSelectMenu: () => true,
    customId: 'search_select_user-1',
    user: { id: 'user-2' },
    reply: async (payload) => {
      replies.push(payload);
    },
    deferUpdate: async () => {
      throw new Error('should not defer');
    }
  });

  assert.equal(handled, true);
  assert.equal(replies.length, 1);
  assert.match(replies[0].embeds[0].data.title, /Not Your Search/i);
});

test('queue clear interaction clears queued tracks and reports the count', async () => {
  let replyPayload;
  let cleared = false;

  const handled = await handleQueueClearInteraction({
    isButton: () => true,
    customId: 'queue_clear',
    guildId: 'guild-1',
    reply: async (payload) => {
      replyPayload = payload;
    }
  }, {
    resolveQueue: () => ({
      currentTrack: { title: 'Now playing' },
      tracks: {
        data: [{}, {}, {}],
        clear: () => {
          cleared = true;
        }
      }
    })
  });

  assert.equal(handled, true);
  assert.equal(cleared, true);
  assert.match(replyPayload.embeds[0].data.description, /Cleared \*\*3\*\* queued tracks/i);
});

test('queue clear interaction rejects missing playback sessions', async () => {
  const replies = [];

  const handled = await handleQueueClearInteraction({
    isButton: () => true,
    customId: 'queue_clear',
    guildId: 'guild-1',
    reply: async (payload) => {
      replies.push(payload);
    }
  }, {
    resolveQueue: () => null
  });

  assert.equal(handled, true);
  assert.equal(replies.length, 1);
  assert.match(replies[0].embeds[0].data.title, /No Active Session/i);
});

test('music settings interaction renders the playback panel', async () => {
  let replyPayload;

  const handled = await handleMusicSettingsInteraction({
    isButton: () => true,
    customId: 'music_settings',
    guildId: 'guild-1',
    reply: async (payload) => {
      replyPayload = payload;
    }
  }, {
    resolveQueue: () => ({
      currentTrack: { title: 'Now playing' },
      repeatMode: 2,
      node: { volume: 67 }
    })
  });

  assert.equal(handled, true);
  assert.match(replyPayload.embeds[0].data.title, /Playback Settings/i);
  assert.match(replyPayload.embeds[0].data.description, /Loop Mode:/i);
  assert.match(replyPayload.embeds[0].data.description, /67%/i);
});

test('music settings interaction ignores unrelated buttons', async () => {
  const handled = await handleMusicSettingsInteraction({
    isButton: () => true,
    customId: 'music_skip',
    reply: async () => {
      throw new Error('should not reply');
    }
  });

  assert.equal(handled, false);
});
