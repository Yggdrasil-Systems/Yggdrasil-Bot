import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildBaseEmbed, buildErrorEmbed, buildSuccessEmbed } from '../src/utils/embeds.js';
import { COLORS } from '../src/utils/constants.js';

test('buildBaseEmbed applies World Tree visual defaults', () => {
  const embed = buildBaseEmbed({ title: 'Tree Status', description: 'Online' }).toJSON();

  assert.equal(embed.title, 'Tree Status');
  assert.equal(embed.description, 'Online');
  assert.equal(embed.color, COLORS.brand);
  assert.equal(embed.footer.text, 'World Tree');
  assert.ok(embed.timestamp);
});

test('success and error embeds use distinct semantic colors', () => {
  const success = buildSuccessEmbed('Ready', 'The bot is online.').toJSON();
  const error = buildErrorEmbed('Command failed', 'Try again later.').toJSON();

  assert.equal(success.color, COLORS.success);
  assert.equal(error.color, COLORS.error);
});
