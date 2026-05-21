import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MessageFlags } from 'discord.js';

import { replyToInteraction, replyToMessage } from '../src/utils/responses.js';

test('replyToInteraction replies to a fresh interaction', async () => {
  const calls = [];
  const interaction = {
    replied: false,
    deferred: false,
    reply: async (payload) => calls.push(['reply', payload]),
    followUp: async (payload) => calls.push(['followUp', payload]),
    editReply: async (payload) => calls.push(['editReply', payload])
  };

  await replyToInteraction(interaction, { content: 'Ready' });

  assert.deepEqual(calls, [['reply', { content: 'Ready', allowedMentions: { parse: [] } }]]);
});

test('replyToInteraction sends ephemeral fresh replies through message flags', async () => {
  const calls = [];
  const interaction = {
    replied: false,
    deferred: false,
    reply: async (payload) => calls.push(['reply', payload]),
    followUp: async (payload) => calls.push(['followUp', payload]),
    editReply: async (payload) => calls.push(['editReply', payload])
  };

  await replyToInteraction(interaction, { content: 'Hidden' }, { ephemeral: true });

  assert.equal(calls[0][0], 'reply');
  assert.equal(calls[0][1].flags, MessageFlags.Ephemeral);
});

test('replyToInteraction follows up after an interaction has already replied', async () => {
  const calls = [];
  const interaction = {
    replied: true,
    deferred: false,
    reply: async (payload) => calls.push(['reply', payload]),
    followUp: async (payload) => calls.push(['followUp', payload]),
    editReply: async (payload) => calls.push(['editReply', payload])
  };

  await replyToInteraction(interaction, { content: 'Later' });

  assert.deepEqual(calls, [['followUp', { content: 'Later', allowedMentions: { parse: [] } }]]);
});

test('replyToInteraction edits a deferred interaction', async () => {
  const calls = [];
  const interaction = {
    replied: false,
    deferred: true,
    reply: async (payload) => calls.push(['reply', payload]),
    followUp: async (payload) => calls.push(['followUp', payload]),
    editReply: async (payload) => calls.push(['editReply', payload])
  };

  await replyToInteraction(interaction, { content: 'Finished' });

  assert.deepEqual(calls, [['editReply', { content: 'Finished', allowedMentions: { parse: [] } }]]);
});

test('replyToMessage falls back to channel send when reply fails', async () => {
  const calls = [];
  const message = {
    reply: async () => {
      throw new Error('Unknown message');
    },
    channel: {
      send: async (payload) => calls.push(['send', payload])
    }
  };

  await replyToMessage(message, { content: 'Fallback' });

  assert.deepEqual(calls, [['send', { content: 'Fallback', allowedMentions: { parse: [] } }]]);
});
