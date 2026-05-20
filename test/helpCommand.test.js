import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHelpEmbed } from '../src/services/helpService.js';

test('help embed explains slash, prefix, and no-prefix command modes', () => {
  const embed = buildHelpEmbed().toJSON();
  const fieldText = embed.fields.map((field) => `${field.name}\n${field.value}`).join('\n');

  assert.equal(embed.title, 'World Tree Help');
  assert.match(fieldText, /slash/i);
  assert.match(fieldText, /tree ping/i);
  assert.match(fieldText, /no-prefix/i);
});
