import { describe, it } from 'node:test';
import assert from 'node:assert';
import { upsertOptions } from '../src/database/mongo/queryOptions.js';

describe('Query Options', () => {
  it('returns correctly configured upsert options', () => {
    const options = upsertOptions();

    assert.strictEqual(options.returnDocument, 'after');
    assert.strictEqual(options.upsert, true);
    assert.strictEqual(options.setDefaultsOnInsert, true);
    assert.strictEqual(options.runValidators, true);
  });
});
