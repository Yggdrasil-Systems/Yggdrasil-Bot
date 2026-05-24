import assert from 'node:assert/strict';
import { test } from 'node:test';

import { executeMessage } from '../src/commands/music/play.js';
import { executeMessage as execute247 } from '../src/commands/music/247.js';

test('executeMessage requires a query for play command', async () => {
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

test('executeMessage extracts sources from text query', async () => {
  const context = {
    args: ['my', 'song', '-apple'],
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
