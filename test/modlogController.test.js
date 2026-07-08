import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

import * as modlogController from '../src/controllers/modlogController.js';
import { settingsService } from '../src/services/settingsService.js';

test('modlogController handles view, set, and disable correctly', async () => {
  mock.method(settingsService, 'getEffectiveSettings', async () => ({ modLogChannelId: 'channel-1' }));
  mock.method(settingsService, 'setModLogChannel', async (guildId, channelId) => ({ modLogChannelId: channelId }));

  // Test view (configured)
  const viewResult = await modlogController.handleView('guild-1');
  assert.match(viewResult.embeds[0].data.description, /<#channel-1>/);

  // Test view (disabled)
  settingsService.getEffectiveSettings.mock.restore();
  mock.method(settingsService, 'getEffectiveSettings', async () => ({ modLogChannelId: null }));
  const viewDisabledResult = await modlogController.handleView('guild-1');
  assert.match(viewDisabledResult.embeds[0].data.description, /currently disabled/i);

  // Test set
  const setResult = await modlogController.handleSet('guild-1', 'channel-2');
  assert.match(setResult.embeds[0].data.description, /<#channel-2>/);
  assert.equal(settingsService.setModLogChannel.mock.calls[0].arguments[1], 'channel-2');

  // Test disable
  const disableResult = await modlogController.handleDisable('guild-1');
  assert.match(disableResult.embeds[0].data.description, /turned off/i);
  assert.equal(settingsService.setModLogChannel.mock.calls[1].arguments[1], null);

  mock.restoreAll();
});
