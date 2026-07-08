import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createModerationRepository } from '../src/database/mongo/repositories/moderationRepository.js';

test('moderationRepository creates guild cases with an atomic counter', async () => {
  const created = [];
  const counterCalls = [];
  const repository = createModerationRepository(
    {
      create: async (payload) => {
        created.push(payload);
        return { toObject: () => payload };
      },
      find: () => ({ sort: () => ({ lean: async () => [] }) })
    },
    {
      findOneAndUpdate: (filter, update, options) => {
        counterCalls.push({ filter, update, options });
        return { lean: async () => ({ seq: 5 }) };
      }
    }
  );

  const moderationCase = await repository.createCase({
    guildId: 'guild-1',
    targetUserId: 'target',
    moderatorId: 'mod',
    actionType: 'warn',
    reason: 'spam'
  });

  assert.equal(moderationCase.caseId, 5);
  assert.equal(created[0].status, 'active');
  assert.deepEqual(counterCalls[0].filter, { _id: 'moderationCase:guild-1' });
  assert.deepEqual(counterCalls[0].update, { $inc: { seq: 1 } });
  assert.equal(counterCalls[0].options.returnDocument, 'after');
});

test('moderationRepository lists active warnings newest first', async () => {
  const calls = [];
  const repository = createModerationRepository({
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
    actionType: { $in: ['warn', 'automod_warn'] },
    status: { $ne: 'deleted' }
  });
  assert.equal(warnings[0].caseId, 2);
});

test('moderationRepository resolves cases without deleting records', async () => {
  const calls = [];
  const repository = createModerationRepository({
    create: async () => ({}),
    find: () => ({ sort: () => ({ lean: async () => [] }) }),
    findOneAndUpdate: (filter, update, options) => {
      calls.push({ filter, update, options });
      return {
        lean: async () => ({
          guildId: filter.guildId,
          caseId: filter.caseId,
          status: update.$set.status,
          resolutionReason: update.$set.resolutionReason
        })
      };
    }
  });

  const moderationCase = await repository.resolveCase({
    guildId: 'guild-1',
    caseId: 12,
    resolvedBy: 'mod',
    resolutionReason: 'Handled'
  });

  assert.equal(moderationCase.status, 'resolved');
  assert.deepEqual(calls[0].filter, { guildId: 'guild-1', caseId: 12, status: { $ne: 'deleted' } });
});
