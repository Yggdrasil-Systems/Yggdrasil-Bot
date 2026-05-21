import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createNoPrefixRepository } from '../src/database/mongo/repositories/noPrefixRepository.js';

test('noPrefixRepository upserts active global no-prefix users', async () => {
  const calls = [];
  const repository = createNoPrefixRepository({
    findOneAndUpdate: (filter, update, options) => {
      calls.push({ filter, update, options });
      return { lean: async () => ({ userId: filter.userId, active: update.$set.active }) };
    }
  });

  const user = await repository.upsertUser({ userId: 'user-1', addedBy: 'owner', reason: 'trusted' });

  assert.equal(user.active, true);
  assert.deepEqual(calls[0].filter, { userId: 'user-1' });
  assert.equal(calls[0].options.returnDocument, 'after');
});
