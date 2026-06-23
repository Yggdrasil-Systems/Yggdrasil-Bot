import { Events, GatewayIntentBits } from 'discord.js';

import { createActivityRoleService } from '../services/activityRoleService.js';
import { logger } from '../utils/logger.js';

export const name = Events.PresenceUpdate;

export async function execute(oldPresence, newPresence, client) {
  if (!client.options.intents.has(GatewayIntentBits.GuildPresences)) {
    logger.warn('╔════════════════════════════════════════════════════════════════╗');
    logger.warn('║  Activity roles are disabled.                                  ║');
    logger.warn('║  To enable them:                                               ║');
    logger.warn('║  1. Go to https://discord.com/developers/applications          ║');
    logger.warn('║  2. Select your bot → Bot → Privileged Gateway Intents         ║');
    logger.warn('║  3. Toggle "PRESENCE INTENT" to ON                             ║');
    logger.warn('║  4. Add GatewayIntentBits.GuildPresences to CLIENT_INTENTS     ║');
    logger.warn('║     in src/config/discord.js                                     ║');
    logger.warn('╚════════════════════════════════════════════════════════════════╝');
    return;
  }

  const settingsService = client.appContext?.settingsService ?? client.settingsService;

  if (!settingsService) {
    logger.warn('PresenceUpdate event fired but settingsService is not available on client.');
    return;
  }

  const service = createActivityRoleService({ settingsService, log: logger });
  await service.handlePresenceUpdate(oldPresence, newPresence);
}
