import { Events } from 'discord.js';

import { createActivityRoleService } from '../services/activityRoleService.js';
import { logger } from '../utils/logger.js';

export const name = Events.VoiceStateUpdate;

export async function execute(oldState, newState, client) {
  const settingsService = client.appContext?.settingsService ?? client.settingsService;

  if (!settingsService) {
    logger.warn('VoiceStateUpdate event fired but settingsService is not available on client.');
    return;
  }

  const service = createActivityRoleService({ settingsService, log: logger });
  await service.handleVoiceStateUpdate(oldState, newState);
}
