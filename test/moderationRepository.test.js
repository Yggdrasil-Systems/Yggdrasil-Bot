import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createModerationRepository } from '../src/database/mongo/repositories/moderationRepository.js';

test('moderationRepository creates sequential guild cases', async () => {
  const created = [];
  const repository = createModerationRepository({
    countDocuments: async () => 4,
    create: async (payload) => {
      created.push(payload);
      return { toObject: () => payload };
    },
    find: () => ({ sort: () => ({ lean: async () => [] }) })
  });

  const moderationCase = await repository.createCase({
    guildId: 'guild-1',
    targetUserId: 'target',
    moderatorId: 'mod',
    actionType: 'warn',
    reason: 'spam'
  });

  assert.equal(moderationCase.caseId, 5);
  assert.equal(created[0].status, 'active');
});

test('moderationRepository lists active warnings newest first', async () => {
  const calls = [];
  const repository = createModerationRepository({
    countDocuments: async () => 0,
    create: async () => ({}),
    find: (filter) => {
      calls.push(filter);
      return {
        sort: (sort) => ({
          lean: async () => [{ caseId: 2, reason: 'spam', sort }]
        })
      };
    }
  });

  const warnings = await repository.listWarnings('guild-1', 'target');

  assert.deepEqual(calls[0], {
    guildId: 'guild-1',
    targetUserId: 'target',
    actionType: 'warn'
  });
  assert.equal(warnings[0].caseId, 2);
});
