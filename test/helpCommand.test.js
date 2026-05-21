import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHelpCategoryEmbed, buildHelpComponents, buildHelpEmbed } from '../src/services/helpService.js';

test('help embed explains slash, prefix, and no-prefix command modes', () => {
  const embed = buildHelpEmbed().toJSON();
  const fieldText = embed.fields.map((field) => `${field.name}\n${field.value}`).join('\n');

  assert.equal(embed.title, 'World Tree Help');
  assert.match(fieldText, /slash/i);
  assert.match(fieldText, /tree ping/i);
  assert.match(fieldText, /no-prefix/i);
});

test('help service builds category embeds and select menu components', () => {
  const embed = buildHelpCategoryEmbed('automod').toJSON();
  const components = buildHelpComponents({ requesterId: 'user-1', selectedCategory: 'automod' });

  assert.match(embed.title, /automod/i);
  assert.equal(components.length, 1);
  assert.match(components[0].components[0].data.custom_id, /help:category:user-1/);
});
