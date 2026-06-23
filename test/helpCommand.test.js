import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHelpCategoryEmbed, buildHelpComponents, buildHelpEmbed } from '../src/services/helpService.js';

test('help embed explains slash, prefix, and no-prefix command modes', () => {
  const embed = buildHelpEmbed().toJSON();
  const fieldText = embed.fields.map((field) => `${field.name}\n${field.value}`).join('\n');

  assert.equal(embed.title, '🌳 World Tree Help');
  assert.match(fieldText, /slash/i);
  assert.match(fieldText, /tree dashboard/i);
  assert.match(fieldText, /tree activityrole list/i);
  assert.match(fieldText, /tree settings view/i);
  assert.match(fieldText, /no-prefix/i);
});

test('help service builds category embeds and select menu components', () => {
  const utility = buildHelpCategoryEmbed('utility').toJSON();
  const settings = buildHelpCategoryEmbed('settings').toJSON();
  const components = buildHelpComponents({ requesterId: 'user-1', selectedCategory: 'automod' });
  const utilityText = utility.fields.map((field) => `${field.name}\n${field.value}`).join('\n');
  const settingsText = settings.fields.map((field) => `${field.name}\n${field.value}`).join('\n');

  assert.match(utility.title, /utility/i);
  assert.match(utilityText, /ownerinfo/i);
  assert.match(utilityText, /dashboard/i);
  assert.match(settingsText, /setmodlog/i);
  assert.match(settingsText, /trustedrole/i);
  assert.match(settingsText, /activityrole/i);
  assert.match(settingsText, /setup-music/i);
  assert.equal(components.length, 1);
  assert.match(components[0].components[0].data.custom_id, /help:category:user-1/);
});
