import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAutomodService } from '../src/services/automod/automodService.js';
import { createAutomodState } from '../src/services/automod/automodState.js';
import { evaluateBadWords } from '../src/services/automod/rules/badWordsRule.js';
import { evaluateCapsSpam } from '../src/services/automod/rules/capsSpamRule.js';
import { evaluateLinkSpam } from '../src/services/automod/rules/linkSpamRule.js';
import { evaluateMentionSpam } from '../src/services/automod/rules/mentionSpamRule.js';
import { evaluateRepeatSpam } from '../src/services/automod/rules/repeatSpamRule.js';

test('bad word rule matches configured words case-insensitively', () => {
  const result = evaluateBadWords({
    content: 'That was a SPAMMY message.',
    rule: { enabled: true, words: ['spammy'], punishment: { action: 'warn' } }
  });

  assert.equal(result.matched, true);
  assert.equal(result.ruleId, 'badWords');
  assert.equal(result.action, 'warn');
});

test('mention spam rule matches threshold mentions', () => {
  const result = evaluateMentionSpam({
    mentionCount: 5,
    rule: { enabled: true, threshold: 4, punishment: { action: 'warn' } }
  });

  assert.equal(result.matched, true);
  assert.equal(result.ruleId, 'mentionSpam');
});

test('repeat spam rule tracks repeated messages within the configured window', () => {
  const state = createAutomodState();
  const rule = { enabled: true, threshold: 3, windowSeconds: 30, punishment: { action: 'delete' } };
  const context = {
    guildId: 'guild',
    userId: 'user',
    content: 'same message',
    now: 1000
  };

  assert.equal(evaluateRepeatSpam({ ...context, rule, state }).matched, false);
  assert.equal(evaluateRepeatSpam({ ...context, now: 2000, rule, state }).matched, false);
  assert.equal(evaluateRepeatSpam({ ...context, now: 3000, rule, state }).matched, true);
});

test('link spam rule respects allowlisted hosts', () => {
  const rule = {
    enabled: true,
    allowList: ['example.com'],
    punishment: { action: 'delete' }
  };

  assert.equal(evaluateLinkSpam({ content: 'https://example.com/post', rule }).matched, false);
  assert.equal(evaluateLinkSpam({ content: 'https://bad.test/post', rule }).matched, true);
});

test('caps spam rule requires minimum length and ratio', () => {
  const rule = {
    enabled: true,
    minLength: 12,
    ratio: 0.7,
    punishment: { action: 'delete' }
  };

  assert.equal(evaluateCapsSpam({ content: 'SHORT', rule }).matched, false);
  assert.equal(evaluateCapsSpam({ content: 'THIS IS TOO LOUD', rule }).matched, true);
});

test('automod service skips commands and ignored channels before punishing', async () => {
  let punished = false;
  const service = createAutomodService({
    settingsService: {
      getEffectiveSettings: async () => ({
        automod: {
          enabled: true,
          ignoredChannelIds: ['channel'],
          ignoredRoleIds: [],
          rules: {
            badWords: { enabled: true, words: ['blocked'], punishment: { action: 'warn' } }
          }
        }
      })
    },
    punishmentExecutor: {
      execute: async () => {
        punished = true;
      }
    }
  });

  await service.handleMessage({
    content: 'blocked',
    guild: { id: 'guild' },
    channel: { id: 'channel' },
    author: { id: 'user', bot: false },
    member: { roles: { cache: new Map() } }
  }, { isCommand: false });

  assert.equal(punished, false);
});

test('automod service can punish normal no-prefix lookalikes when routing did not execute a command', async () => {
  let punished = false;
  const service = createAutomodService({
    settingsService: {
      getEffectiveSettings: async () => ({
        automod: {
          enabled: true,
          ignoredChannelIds: [],
          ignoredRoleIds: [],
          logActions: true,
          rules: {
            badWords: { enabled: true, words: ['ping'], punishment: { action: 'delete' } },
            mentionSpam: { enabled: false },
            repeatSpam: { enabled: false },
            linkSpam: { enabled: false },
            capsSpam: { enabled: false }
          }
        }
      })
    },
    punishmentExecutor: {
      execute: async () => {
        punished = true;
      }
    }
  });

  await service.handleMessage({
    content: 'ping',
    guild: { id: 'guild' },
    channel: { id: 'channel' },
    author: { id: 'user', bot: false },
    member: { roles: { cache: new Map() } },
    mentions: { users: { size: 0 }, roles: { size: 0 } }
  }, { isCommand: false });

  assert.equal(punished, true);
});


test('automodState dispose clears interval and state without error', () => {
  const state = createAutomodState();
  state.setRepeatedMessages('key', [{ createdAt: Date.now() }]);
  assert.equal(state.getRepeatedMessages('key').length, 1);

  state.dispose();
  assert.equal(state.getRepeatedMessages('key').length, 0);

  // Idempotent: calling dispose again should not throw.
  state.dispose();
});

test('automodState enforces maxEntries with batch eviction', () => {
  const maxEntries = 10;
  const state = createAutomodState({ maxEntries });

  for (let i = 0; i < maxEntries; i++) {
    state.setRepeatedMessages(`key-${i}`, [{ createdAt: Date.now() }]);
  }
  
  assert.equal(state.size, maxEntries);

  // Setting the 11th entry should trigger eviction of the oldest 10% (1 entry)
  state.setRepeatedMessages('key-10', [{ createdAt: Date.now() }]);
  
  // size should be 10 again (11 added, 1 evicted)
  assert.equal(state.size, maxEntries);
  
  // 'key-0' should be the one evicted as it was the oldest
  assert.equal(state.getRepeatedMessages('key-0').length, 0);
  assert.equal(state.getRepeatedMessages('key-1').length, 1);
  assert.equal(state.getRepeatedMessages('key-10').length, 1);
  
  state.dispose();
});

test('automodState handles maxEntries of 1 correctly', () => {
  const state = createAutomodState({ maxEntries: 1 });

  state.setRepeatedMessages('first', [{ createdAt: Date.now() }]);
  assert.equal(state.size, 1);

  state.setRepeatedMessages('second', [{ createdAt: Date.now() }]);
  assert.equal(state.size, 1);
  assert.equal(state.getRepeatedMessages('first').length, 0);
  assert.equal(state.getRepeatedMessages('second').length, 1);

  state.dispose();
});

test('automodState does not evict when updating an existing key', () => {
  const maxEntries = 3;
  const state = createAutomodState({ maxEntries });

  state.setRepeatedMessages('key-0', [{ createdAt: Date.now() }]);
  state.setRepeatedMessages('key-1', [{ createdAt: Date.now() }]);
  state.setRepeatedMessages('key-2', [{ createdAt: Date.now() }]);
  assert.equal(state.size, 3);

  // Updating an existing key should NOT trigger eviction — size stays at 3
  state.setRepeatedMessages('key-1', [{ createdAt: Date.now() }, { createdAt: Date.now() }]);
  assert.equal(state.size, 3);
  assert.equal(state.getRepeatedMessages('key-0').length, 1);
  assert.equal(state.getRepeatedMessages('key-1').length, 2);
  assert.equal(state.getRepeatedMessages('key-2').length, 1);

  state.dispose();
});
