import { Events } from 'discord.js';

import { createActivityRoleService } from '../services/activityRoleService.js';
import { logger } from '../utils/logger.js';

export const name = Events.VoiceStateUpdate;

// Cache the service instance so we don't re-create it on every voice state event.
let cachedService = null;

function getService(settingsService) {
  if (!cachedService) {
    cachedService = createActivityRoleService({ settingsService, log: logger });
  }
  return cachedService;
}

export async function execute(oldState, newState, client, appContext = null) {
  const settingsService = appContext?.settingsService;

  if (!settingsService) {
    logger.warn('VoiceStateUpdate event fired but settingsService is not available on client.');
    return;
  }

  const service = getService(settingsService);
  await service.handleVoiceStateUpdate(oldState, newState);
}
