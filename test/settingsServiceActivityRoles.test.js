import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSettingsService } from '../src/services/settingsService.js';

function createMockRepository() {
  const data = {};

  return {
    async getOrCreate(guildId) {
      return data[guildId] ?? { guildId };
    },

    async setActivityRole(guildId, activityType, config) {
      if (!data[guildId]) data[guildId] = { guildId };
      if (!data[guildId].activityRoles) data[guildId].activityRoles = {};
      data[guildId].activityRoles[activityType] = config;
      return data[guildId];
    },

    async removeActivityRole(guildId, activityType) {
      if (!data[guildId]) data[guildId] = { guildId };
      if (!data[guildId].activityRoles) data[guildId].activityRoles = {};
      data[guildId].activityRoles[activityType] = { enabled: false, roleId: null };
      return data[guildId];
    }
  };
}

test('settingsService normalizes activityRoles with defaults', async () => {
  const service = createSettingsService(createMockRepository());
  const settings = await service.getEffectiveSettings('guild-1');

  assert.equal(settings.activityRoles.spotify.enabled, false);
  assert.equal(settings.activityRoles.spotify.roleId, null);
  assert.equal(settings.activityRoles.streaming.enabled, false);
  assert.equal(settings.activityRoles.gaming.enabled, false);
  assert.equal(settings.activityRoles.voice.enabled, false);
});

test('settingsService sets activity role', async () => {
  const service = createSettingsService(createMockRepository());
  const settings = await service.setActivityRole('guild-1', 'spotify', { enabled: true, roleId: 'role-123' });

  assert.equal(settings.activityRoles.spotify.enabled, true);
  assert.equal(settings.activityRoles.spotify.roleId, 'role-123');
});

test('settingsService removes activity role', async () => {
  const repo = createMockRepository();
  await repo.setActivityRole('guild-1', 'spotify', { enabled: true, roleId: 'role-123' });

  const service = createSettingsService(repo);
  const settings = await service.removeActivityRole('guild-1', 'spotify');

  assert.equal(settings.activityRoles.spotify.enabled, false);
  assert.equal(settings.activityRoles.spotify.roleId, null);
});

test('settingsService clears cache after activity role change', async () => {
  const repo = createMockRepository();
  const service = createSettingsService(repo);

  await service.getEffectiveSettings('guild-1');
  await service.setActivityRole('guild-1', 'spotify', { enabled: true, roleId: 'role-123' });

  // After set, cache should be cleared; next get should read from repo
  const settings = await service.getEffectiveSettings('guild-1');
  assert.equal(settings.activityRoles.spotify.enabled, true);
});

test('settingsService rejects invalid activity type', async () => {
  const service = createSettingsService(createMockRepository());

  await assert.rejects(
    async () => service.setActivityRole('guild-1', 'invalid', { enabled: true, roleId: 'role-123' }),
    /Unsupported activity type/
  );
});

test('settingsService preserves existing settings when adding activity role', async () => {
  const repo = createMockRepository();
  await repo.setActivityRole('guild-1', 'spotify', { enabled: true, roleId: 'role-123' });

  const service = createSettingsService(repo);
  await service.setActivityRole('guild-1', 'streaming', { enabled: true, roleId: 'role-456' });

  const settings = await service.getEffectiveSettings('guild-1');
  assert.equal(settings.activityRoles.spotify.enabled, true);
  assert.equal(settings.activityRoles.spotify.roleId, 'role-123');
  assert.equal(settings.activityRoles.streaming.enabled, true);
  assert.equal(settings.activityRoles.streaming.roleId, 'role-456');
});
