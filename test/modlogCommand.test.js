import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

import * as modlogCommand from '../src/commands/setup/modlog.js';
import * as setmodlogWrapper from '../src/commands/setup/setmodlog.js';
import { settingsService } from '../src/services/settingsService.js';

test('modlogCommand routes slash command subcommands to the controller', async () => {
  mock.method(settingsService, 'getEffectiveSettings', async () => ({ modLogChannelId: 'channel-1' }));
  mock.method(settingsService, 'setModLogChannel', async (guildId, channelId) => ({ modLogChannelId: channelId }));

  let replyPayload = null;
  const buildInteraction = (subcommand) => ({
    guildId: 'guild-1',
    options: {
      getSubcommand: () => subcommand,
      getChannel: () => ({ id: 'channel-1' })
    },
    deferred: false,
    replied: false,
    reply: async (p) => {
      replyPayload = p;
    }
  });

  await modlogCommand.execute(buildInteraction('view'));
  assert.match(replyPayload.embeds[0].data.description, /<#channel-1>/);

  await modlogCommand.execute(buildInteraction('set'));
  assert.match(replyPayload.embeds[0].data.description, /<#channel-1>/);

  await modlogCommand.execute(buildInteraction('disable'));
  assert.match(replyPayload.embeds[0].data.description, /turned off/i);

  mock.restoreAll();
});

test('modlogCommand routes prefix args to the controller and handles deprecation', async () => {
  mock.method(settingsService, 'getEffectiveSettings', async () => ({ modLogChannelId: 'channel-1' }));
  mock.method(settingsService, 'setModLogChannel', async (guildId, channelId) => ({ modLogChannelId: channelId }));

  let responsePayload = null;
  const buildContext = (args, mentions = []) => ({
    guild: { id: 'guild-1' },
    args,
    message: {
      mentions: {
        channels: {
          size: mentions.length,
          first: () => mentions[0]
        }
      }
    },
    respond: async (p) => {
      responsePayload = p;
    }
  });

  // Test explicit view
  await modlogCommand.executeMessage(buildContext(['view']));
  assert.match(responsePayload.embeds[0].data.description, /<#channel-1>/);

  // Test implicit view (backward compat)
  await modlogCommand.executeMessage(buildContext([]));
  assert.match(responsePayload.embeds[0].data.description, /<#channel-1>/);

  // Test set
  await modlogCommand.executeMessage(buildContext(['set'], [{ id: 'channel-1' }]));
  assert.match(responsePayload.embeds[0].data.description, /<#channel-1>/);

  // Test disable
  await modlogCommand.executeMessage(buildContext(['disable']));
  assert.match(responsePayload.embeds[0].data.description, /turned off/i);

  // Test deprecated setter (`tree modlog #channel`)
  await modlogCommand.executeMessage(buildContext(['<#channel-1>'], [{ id: 'channel-1' }]));
  assert.match(responsePayload.content, /deprecated/i);
  assert.match(responsePayload.embeds[0].data.description, /<#channel-1>/);

  mock.restoreAll();
});

test('setmodlog wrapper triggers deprecation notice and delegates to handleSet', async () => {
  mock.method(settingsService, 'setModLogChannel', async (guildId, channelId) => ({ modLogChannelId: channelId }));

  let replyCount = 0;
  let replyPayload = null;
  let followUpPayload = null;

  const interaction = {
    guildId: 'guild-1',
    options: {
      getChannel: () => ({ id: 'channel-1' })
    },
    deferred: false,
    get replied() {
      return replyCount > 0;
    },
    reply: async (p) => {
      replyCount++;
      replyPayload = p;
    },
    followUp: async (p) => {
      followUpPayload = p;
    }
  };

  await setmodlogWrapper.execute(interaction);

  assert.equal(replyCount, 1);
  assert.match(replyPayload.content, /deprecated/i);
  assert.match(followUpPayload.embeds[0].data.description, /<#channel-1>/);

  // Test prefix wrapper
  let respondPayload = null;
  const context = {
    guild: { id: 'guild-1' },
    message: {
      mentions: {
        channels: {
          first: () => ({ id: 'channel-1' })
        }
      }
    },
    respond: async (p) => {
      respondPayload = p;
    }
  };

  await setmodlogWrapper.executeMessage(context);
  assert.match(respondPayload.content, /deprecated/i);
  assert.match(respondPayload.embeds[0].data.description, /<#channel-1>/);

  mock.restoreAll();
});
