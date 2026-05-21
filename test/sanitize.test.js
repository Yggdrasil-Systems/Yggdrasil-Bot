import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sanitizeMentions } from '../src/utils/sanitize.js';

describe('sanitize mention injection protection', () => {
  it('sanitizeMentions strips @everyone from mid-sentence input', () => {
    assert.equal(sanitizeMentions('hello @everyone now'), 'hello now');
  });

  it('sanitizeMentions strips @here from end of string', () => {
    assert.equal(sanitizeMentions('heads up @here'), 'heads up');
  });

  it('sanitizeMentions strips user and role mention patterns', () => {
    assert.equal(sanitizeMentions('<@123456789> <@!123456789> <@&123456789>'), '');
  });

  it('sanitizeMentions leaves normal text untouched', () => {
    assert.equal(sanitizeMentions('normal reason text'), 'normal reason text');
  });

  it('sanitizeMentions handles empty string and null gracefully', () => {
    assert.deepEqual([sanitizeMentions(''), sanitizeMentions(null)], ['', '']);
  });
});
