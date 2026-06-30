import assert from 'node:assert/strict';
import { test } from 'node:test';

import { executeMessage as executeResume } from '../src/commands/music/resume.js';
import { executeMessage as executePause } from '../src/commands/music/pause.js';

function createMockContext({ isPaused, hasQueue, currentTrack } = {}) {
  let paused = isPaused;
  let payload = null;

  const queue = hasQueue ? {
    currentTrack: currentTrack ?? { title: 'Test Song' },
    node: {
      isPaused: () => paused,
      setPaused: (value) => {
        paused = value;
      }
    }
  } : null;

  return {
    guild: { id: 'guild-1' },
    appContext: {
      playerService: {
        getGuildQueue: () => queue
      }
    },
    respond: async (response) => {
      payload = response;
    },
    getPayload: () => payload,
    wasPaused: () => paused
  };
}

test('resume command resumes a paused track', async () => {
  const context = createMockContext({ isPaused: true, hasQueue: true });
  await executeResume(context);

  const payload = context.getPayload();
  assert.ok(payload);
  assert.match(payload.embeds[0].data.title, /▶️ Resumed/i);
  assert.equal(context.wasPaused(), false);
});

test('resume command warns if already playing', async () => {
  const context = createMockContext({ isPaused: false, hasQueue: true });
  await executeResume(context);

  const payload = context.getPayload();
  assert.ok(payload);
  assert.match(payload.embeds[0].data.title, /▶️ Already Playing/i);
  assert.equal(context.wasPaused(), false);
});

test('resume command handles missing queue', async () => {
  const context = createMockContext({ hasQueue: false });
  await executeResume(context);

  const payload = context.getPayload();
  assert.ok(payload);
  assert.match(payload.embeds[0].data.title, /❌ No Active Session/i);
});

test('pause command pauses a playing track', async () => {
  const context = createMockContext({ isPaused: false, hasQueue: true });
  await executePause(context);

  const payload = context.getPayload();
  assert.ok(payload);
  assert.match(payload.embeds[0].data.title, /⏸️ Paused/i);
  assert.equal(context.wasPaused(), true);
});

test('pause command warns if already paused', async () => {
  const context = createMockContext({ isPaused: true, hasQueue: true });
  await executePause(context);

  const payload = context.getPayload();
  assert.ok(payload);
  assert.match(payload.embeds[0].data.title, /⏸️ Already Paused/i);
  assert.equal(context.wasPaused(), true);
});

test('pause command handles missing queue', async () => {
  const context = createMockContext({ hasQueue: false });
  await executePause(context);

  const payload = context.getPayload();
  assert.ok(payload);
  assert.match(payload.embeds[0].data.title, /❌ No Active Session/i);
});
