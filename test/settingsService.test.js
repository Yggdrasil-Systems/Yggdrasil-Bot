import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSettingsService } from '../src/services/settingsService.js';

test('settingsService normalizes legacy guild settings with nested automod defaults', async () => {
  const service = createSettingsService({
    getOrCreate: async () => ({
      guildId: 'guild',
      automodEnabled: true,
      trustedAdminRoleIds: []
    })
  });

  const settings = await service.getEffectiveSettings('guild');

  assert.equal(settings.automod.enabled, true);
  assert.equal(settings.automod.rules.badWords.enabled, false);
  assert.equal(settings.automod.rules.mentionSpam.threshold, 5);
  assert.deepEqual(settings.automod.ignoredChannelIds, []);
});

test('settingsService invalidates cache after updates', async () => {
  let calls = 0;
  const service = createSettingsService(
    {
      getOrCreate: async () => {
        calls += 1;
        return { guildId: 'guild', trustedAdminRoleIds: [] };
      },
      setModLogChannel: async () => ({ guildId: 'guild', modLogChannelId: 'logs' })
    },
    { cacheTtlMs: 10000 }
  );

  await service.getEffectiveSettings('guild');
  await service.getEffectiveSettings('guild');
  assert.equal(calls, 1);

  await service.setModLogChannel('guild', 'logs');
  await service.getEffectiveSettings('guild');
  assert.equal(calls, 2);
});

test('settingsService allows setting modLogChannelId to null to disable it', async () => {
  const service = createSettingsService({
    setModLogChannel: async (guildId, channelId) => ({ guildId, modLogChannelId: channelId })
  });

  const settings = await service.setModLogChannel('guild', null);
  assert.equal(settings.modLogChannelId, null);
});
