import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createSettingsRepository
} from '../src/database/mongo/repositories/settingsRepository.js';

test('settingsRepository gets or creates default guild settings', async () => {
  const calls = [];
  const repository = createSettingsRepository({
    findOneAndUpdate: (filter, update, options) => {
      calls.push({ filter, update, options });
      return {
        lean: async () => ({
          guildId: filter.guildId,
          automodEnabled: false,
          trustedAdminRoleIds: []
        })
      };
    }
  });

  const settings = await repository.getOrCreate('guild-1');

  assert.equal(settings.guildId, 'guild-1');
  assert.deepEqual(calls[0].filter, { guildId: 'guild-1' });
  assert.equal(calls[0].options.upsert, true);
});

test('settingsRepository updates the mod log channel', async () => {
  const updates = [];
  const repository = createSettingsRepository({
    findOneAndUpdate: (filter, update, options) => {
      updates.push({ filter, update, options });
      return {
        lean: async () => ({
          guildId: filter.guildId,
          modLogChannelId: update.$set.modLogChannelId
        })
      };
    }
  });

  const settings = await repository.setModLogChannel('guild-1', 'channel-1');

  assert.equal(settings.modLogChannelId, 'channel-1');
  assert.deepEqual(updates[0].update, { $set: { modLogChannelId: 'channel-1' } });
});
