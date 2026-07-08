import { buildModerationLogEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export function createLoggingService() {
  return {
    async sendModerationLog({ guild, settings, moderationCase, targetUser, moderatorUser }) {
      if (!settings?.modLogChannelId) {
        return false;
      }

      const channel =
        guild.channels.cache.get(settings.modLogChannelId) ??
        (await guild.channels.fetch(settings.modLogChannelId).catch(() => null));

      if (!channel?.send) {
        return false;
      }

      try {
        await channel.send({
          embeds: [
            buildModerationLogEmbed({
              moderationCase,
              targetUser,
              moderatorUser
            })
          ]
        });
        return true;
      } catch (error) {
        logger.error('Failed to write to modlog channel.', error);
        return false;
      }
    }
  };
}

export const loggingService = createLoggingService();
