import assert from 'node:assert/strict';
import { test } from 'node:test';

import { executeMessage } from '../src/commands/setup/activityrole.js';
import { settingsService } from '../src/services/settingsService.js';

test('activityrole list returns the activity-role summary embed', async () => {
  const originalGetEffectiveSettings = settingsService.getEffectiveSettings;
  let payload;

  settingsService.getEffectiveSettings = async () => ({
    activityRoles: {
      spotify: { enabled: true, roleId: 'role-123' },
      streaming: { enabled: false, roleId: null },
      gaming: { enabled: false, roleId: null },
      voice: { enabled: false, roleId: null }
    }
  });

  try {
    await executeMessage({
      guild: { id: 'guild-1' },
      args: ['list'],
      respond: async (response) => {
        payload = response;
      }
    });
  } finally {
    settingsService.getEffectiveSettings = originalGetEffectiveSettings;
  }

  assert.ok(payload);
  const embed = payload.embeds[0].data;

  assert.match(embed.title, /Activity Roles/i);
  assert.match(embed.description, /Spotify/i);
  assert.match(embed.description, /role-123/i);
});
