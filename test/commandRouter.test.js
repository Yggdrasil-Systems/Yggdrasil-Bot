import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Collection, MessageFlags } from 'discord.js';

import { handleChatInputCommand } from '../src/middleware/commandRouter.js';

function createInteraction({ commandName = 'missing', command } = {}) {
  const calls = [];
  const commands = new Collection();

  if (command) {
    commands.set(commandName, command);
  }

  return {
    interaction: {
      commandName,
      client: { commands },
      replied: false,
      deferred: false,
      reply: async (payload) => calls.push(['reply', payload]),
      followUp: async (payload) => calls.push(['followUp', payload]),
      editReply: async (payload) => calls.push(['editReply', payload])
    },
    calls
  };
}

test('handleChatInputCommand executes a known command', async () => {
  let executed = false;
  const { interaction, calls } = createInteraction({
    commandName: 'ping',
    command: {
      execute: async () => {
        executed = true;
      }
    }
  });

  await handleChatInputCommand(interaction);

  assert.equal(executed, true);
  assert.deepEqual(calls, []);
});

test('handleChatInputCommand answers unknown commands ephemerally', async () => {
  const { interaction, calls } = createInteraction({ commandName: 'missing' });
  const warnings = [];

  await handleChatInputCommand(interaction, {
    log: {
      warn: (message) => warnings.push(message)
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'reply');
  assert.equal(calls[0][1].flags, MessageFlags.Ephemeral);
  assert.match(calls[0][1].embeds[0].data.description, /not available/i);
  assert.deepEqual(warnings, ['No command handler found for /missing.']);
});
