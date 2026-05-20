import assert from 'node:assert/strict';
import { PermissionsBitField } from 'discord.js';
import { test } from 'node:test';

import { createModerationService } from '../src/services/moderationService.js';

function createMember({ id, manageable = true, permissions = [] } = {}) {
  return {
    id,
    user: { id, tag: `${id}#0001` },
    manageable,
    moderatable: manageable,
    kickable: manageable,
    bannable: manageable,
    permissions: new PermissionsBitField(permissions),
    roles: { highest: { position: id === 'target' ? 1 : 10 } },
    timeout: async () => {},
    kick: async () => {}
  };
}

function createService() {
  const cases = [];
  const logs = [];

  return {
    cases,
    logs,
    service: createModerationService({
      moderationRepository: {
        createCase: async (payload) => {
          const created = { caseId: cases.length + 1, ...payload };
          cases.push(created);
          return created;
        },
        listWarnings: async () => cases.filter((item) => item.actionType === 'warn')
      },
      settingsRepository: {
        getOrCreate: async () => ({ modLogChannelId: 'log-channel' })
      },
      loggingService: {
        sendModerationLog: async (payload) => logs.push(payload)
      }
    })
  };
}

test('moderationService creates and logs warning cases', async () => {
  const { service, cases, logs } = createService();
  const result = await service.warn({
    guild: { id: 'guild-1', channels: { cache: new Map() } },
    moderatorMember: createMember({ id: 'mod', permissions: [PermissionsBitField.Flags.ModerateMembers] }),
    targetMember: createMember({ id: 'target' }),
    reason: 'Spam'
  });

  assert.equal(result.ok, true);
  assert.equal(cases[0].actionType, 'warn');
  assert.equal(logs.length, 1);
});

test('moderationService rejects moderation without a reason', async () => {
  const { service } = createService();
  const result = await service.warn({
    guild: { id: 'guild-1' },
    moderatorMember: createMember({ id: 'mod', permissions: [PermissionsBitField.Flags.ModerateMembers] }),
    targetMember: createMember({ id: 'target' }),
    reason: ''
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /reason/i);
});

test('moderationService blocks unsafe target hierarchy', async () => {
  const { service } = createService();
  const result = await service.kick({
    guild: { id: 'guild-1' },
    moderatorMember: createMember({ id: 'mod', permissions: [PermissionsBitField.Flags.KickMembers] }),
    targetMember: { ...createMember({ id: 'target' }), kickable: false },
    reason: 'Unsafe'
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /cannot act/i);
});
