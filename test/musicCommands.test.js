import assert from 'node:assert/strict';
import { test } from 'node:test';

import { executeMessage, formatMusicErrorMessage } from '../src/commands/music/play.js';
import { executeMessage as execute247 } from '../src/commands/music/247.js';

test('play executeMessage requires a query', async () => {
  const context = {
    args: [],
    member: { voice: { channel: { id: '123' } } },
    message: { channel: {} },
    respond: async (payload) => {
      assert.equal(payload.embeds[0].data.title, '❌ Missing Query');
    }
  };

  await executeMessage(context);
});

test('play executeMessage requires voice channel', async () => {
  const context = {
    args: ['my', 'song'],
    member: { voice: { channel: null } },
    message: { channel: {} },
    user: { id: '1', username: 'test' },
    respond: async (payload) => {
      assert.equal(payload.embeds[0].data.title, '❌ Voice Channel Required');
    }
  };

  await executeMessage(context);
});

test('execute247 requires a voice channel', async () => {
  const context = {
    args: [],
    member: { voice: { channel: null } },
    message: { channel: {} },
    respond: async (payload) => {
      assert.equal(payload.embeds[0].data.title, '❌ Voice Channel Required');
    }
  };

  await execute247(context);
});

test('formatMusicErrorMessage handles non-Error thrown values', () => {
  assert.equal(formatMusicErrorMessage('provider failed'), 'provider failed');
  assert.equal(formatMusicErrorMessage({ code: 'E_PROVIDER' }), 'Unknown error');
  assert.equal(formatMusicErrorMessage(new Error('stream failed')), 'stream failed');
  assert.equal(formatMusicErrorMessage('x'.repeat(200)).length, 150);
});
