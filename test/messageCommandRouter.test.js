import assert from 'node:assert/strict';
import { Collection, PermissionsBitField } from 'discord.js';
import { test } from 'node:test';

import { handleMessageCommand } from '../src/middleware/messageCommandRouter.js';

function createMessage({ content, command, commandName = 'ping', member, guildOwnerId = 'owner' }) {
  const replies = [];
  const commands = new Collection();

  if (command) {
    commands.set(commandName, command);
  }

  return {
    message: {
      content,
      author: { id: 'user', bot: false },
      member,
      guild: { id: 'guild', ownerId: guildOwnerId },
      client: { commands },
      reply: async (payload) => replies.push(payload)
    },
    replies
  };
}

test('handleMessageCommand routes case-insensitive tree prefix commands', async () => {
  let context;
  const { message, replies } = createMessage({
    content: 'TREE ping',
    command: {
      name: 'ping',
      executeMessage: async (receivedContext) => {
        context = receivedContext;
      }
    }
  });

  await handleMessageCommand(message);

  assert.equal(context.commandName, 'ping');
  assert.equal(context.mode, 'prefix');
  assert.deepEqual(context.args, []);
  assert.deepEqual(replies, []);
});

test('handleMessageCommand silently ignores normal no-prefix chat', async () => {
  let executed = false;
  const { message, replies } = createMessage({
    content: 'ping',
    command: {
      name: 'ping',
      allowNoPrefix: true,
      executeMessage: async () => {
        executed = true;
      }
    },
    member: {
      permissions: new PermissionsBitField([]),
      roles: { cache: new Map() }
    }
  });

  await handleMessageCommand(message);

  assert.equal(executed, false);
  assert.deepEqual(replies, []);
});

test('handleMessageCommand allows no-prefix shortcuts for privileged users', async () => {
  let context;
  const { message } = createMessage({
    content: 'ping',
    command: {
      name: 'ping',
      allowNoPrefix: true,
      executeMessage: async (receivedContext) => {
        context = receivedContext;
      }
    },
    member: {
      permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator),
      roles: { cache: new Map() }
    }
  });

  await handleMessageCommand(message);

  assert.equal(context.mode, 'no-prefix');
  assert.equal(context.commandName, 'ping');
});

test('handleMessageCommand does not trigger no-prefix aliases', async () => {
  let executed = false;
  const { message, replies } = createMessage({
    content: 'p',
    command: {
      name: 'ping',
      aliases: ['p'],
      allowNoPrefix: true,
      executeMessage: async () => {
        executed = true;
      }
    },
    member: {
      permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator),
      roles: { cache: new Map() }
    }
  });

  await handleMessageCommand(message);

  assert.equal(executed, false);
  assert.deepEqual(replies, []);
});

test('handleMessageCommand denies admin prefix commands for normal users', async () => {
  let executed = false;
  const { message, replies } = createMessage({
    content: 'tree purge 10',
    commandName: 'purge',
    command: {
      name: 'purge',
      adminOnly: true,
      executeMessage: async () => {
        executed = true;
      }
    },
    member: {
      permissions: new PermissionsBitField([]),
      roles: { cache: new Map() }
    }
  });

  await handleMessageCommand(message);

  assert.equal(executed, false);
  assert.equal(replies.length, 1);
  assert.match(replies[0].embeds[0].data.description, /permission/i);
});
