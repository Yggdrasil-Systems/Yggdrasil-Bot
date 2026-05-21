import assert from 'node:assert/strict';
import { PermissionsBitField } from 'discord.js';
import { afterEach, describe, it } from 'node:test';

import { createModerationService } from '../src/services/moderationService.js';

const originalError = console.error;

function createMember(id) {
  return {
    id,
    user: { id, username: id },
    permissions: new PermissionsBitField(PermissionsBitField.Flags.ModerateMembers),
    roles: { highest: { position: id === 'mod' ? 10 : 1 } },
    manageable: true,
    moderatable: true,
    timeout: async () => true
  };
}

function createServiceWithFailingLog() {
  const cases = [];
  const service = createModerationService({
    moderationRepository: {
      createCase: async (payload) => {
        cases.push(payload);
        return { caseId: cases.length, ...payload };
      }
    },
    settingsRepository: { getOrCreate: async () => ({ modLogChannelId: 'log' }) },
    loggingService: { sendModerationLog: async () => { throw new Error('missing access'); } }
  });
  return { service, cases };
}

describe('moderation logging isolation', () => {
  afterEach(() => {
    console.error = originalError;
  });

  it('when log channel send rejects the moderation service still resolves success', async () => {
    console.error = () => {};
    const { service } = createServiceWithFailingLog();

    const result = await service.warn({
      guild: { id: 'guild-1', ownerId: 'owner' },
      moderatorMember: createMember('mod'),
      targetMember: createMember('target'),
      reason: 'spam'
    });

    assert.equal(result.ok, true);
  });

  it('logging error includes guild ID and action type metadata', async () => {
    const calls = [];
    console.error = (...args) => calls.push(args);
    const { service } = createServiceWithFailingLog();

    await service.warn({
      guild: { id: 'guild-1', ownerId: 'owner' },
      moderatorMember: createMember('mod'),
      targetMember: createMember('target'),
      reason: 'spam'
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual([calls[0][1].guildId, calls[0][1].action], ['guild-1', 'warn']);
  });

  it('chaining two moderation actions works even if the first action log fails', async () => {
    console.error = () => {};
    const { service } = createServiceWithFailingLog();

    const first = await service.warn({ guild: { id: 'guild-1', ownerId: 'owner' }, moderatorMember: createMember('mod'), targetMember: createMember('target'), reason: 'one' });
    const second = await service.warn({ guild: { id: 'guild-1', ownerId: 'owner' }, moderatorMember: createMember('mod'), targetMember: createMember('target'), reason: 'two' });

    assert.deepEqual([first.ok, second.ok], [true, true]);
  });
});
