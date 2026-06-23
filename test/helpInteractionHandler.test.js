import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleHelpSelectInteraction } from '../src/interactions/helpInteractionHandler.js';

test('help interaction handler updates the selected category for the requester', async () => {
  let updatePayload;

  const handled = await handleHelpSelectInteraction({
    isStringSelectMenu: () => true,
    customId: 'help:category:user-1',
    user: { id: 'user-1' },
    values: ['settings'],
    update: async (payload) => {
      updatePayload = payload;
    },
    reply: async () => {
      throw new Error('should not reply');
    }
  });

  assert.equal(handled, true);
  assert.match(updatePayload.embeds[0].data.title, /Settings/i);
});

test('help interaction handler rejects other users with an ephemeral error', async () => {
  const calls = [];

  const handled = await handleHelpSelectInteraction({
    isStringSelectMenu: () => true,
    customId: 'help:category:user-1',
    user: { id: 'user-2' },
    values: ['overview'],
    reply: async (payload) => {
      calls.push(payload);
    },
    update: async () => {
      throw new Error('should not update');
    }
  });

  assert.equal(handled, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].embeds[0].data.title, /Help session locked/i);
});

test('help interaction handler ignores unrelated select menus', async () => {
  const handled = await handleHelpSelectInteraction({
    isStringSelectMenu: () => true,
    customId: 'search_select_user-1',
    user: { id: 'user-1' },
    values: ['1'],
    update: async () => {
      throw new Error('should not update');
    },
    reply: async () => {
      throw new Error('should not reply');
    }
  });

  assert.equal(handled, false);
});
