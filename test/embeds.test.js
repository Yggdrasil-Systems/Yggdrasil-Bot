import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildBaseEmbed, buildErrorEmbed, buildModerationLogEmbed, buildPingEmbed, buildSuccessEmbed } from '../src/utils/embeds.js';
import { COLORS } from '../src/utils/constants.js';

test('buildBaseEmbed applies World Tree visual defaults', () => {
  const embed = buildBaseEmbed({ title: 'Tree Status', description: 'Online' }).toJSON();

  assert.equal(embed.title, 'Tree Status');
  assert.equal(embed.description, 'Online');
  assert.equal(embed.color, COLORS.brand);
  assert.equal(embed.footer.text, 'World Tree \u2022 Premium Discord Experience');
  assert.ok(embed.timestamp);
});

test('success and error embeds use distinct semantic colors', () => {
  const success = buildSuccessEmbed('Ready', 'The bot is online.').toJSON();
  const error = buildErrorEmbed('Command failed', 'Try again later.').toJSON();

  assert.equal(success.color, COLORS.success);
  assert.equal(error.color, COLORS.error);
  assert.match(success.title, /✅ Ready/);
  assert.match(error.title, /❌ Command failed/);
});

test('ping embed exposes gateway and response latency fields', () => {
  const embed = buildPingEmbed({
    websocketLatency: 20,
    responseLatency: 15,
    description: 'Gateway latency: 20ms\nResponse time: 15ms'
  }).toJSON();

  assert.equal(embed.fields[0].name, 'ℹ️ Latency Information');
  assert.ok(embed.fields[1]);
});

test('moderation log embed formats purge channel targets without user mentions', () => {
  const embed = buildModerationLogEmbed({
    moderationCase: {
      caseId: 3,
      actionType: 'purge',
      targetUserId: '123456789012345678',
      moderatorId: 'mod',
      reason: 'Cleanup',
      metadata: { targetType: 'channel', channelId: '123456789012345678' }
    },
    targetUser: { username: 'channel' },
    moderatorUser: { username: 'Mod' }
  }).toJSON();

  assert.match(embed.fields[0].value, /<#123456789012345678>/);
});
