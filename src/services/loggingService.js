import { buildModerationLogEmbed } from '../utils/embeds.js';
import { sendToChannel } from '../utils/reply.js';

export function createLoggingService() {
  return {
    async sendModerationLog({ guild, settings, moderationCase, targetUser, moderatorUser }) {
      if (!settings?.modLogChannelId) {
        return false;
      }

      const channel = guild.channels.cache.get(settings.modLogChannelId)
        ?? await guild.channels.fetch(settings.modLogChannelId).catch(() => null);

      if (!channel?.send) {
        return false;
      }

      await sendToChannel(channel, {
        embeds: [
          buildModerationLogEmbed({
            moderationCase,
            targetUser,
            moderatorUser
          })
        ]
      });

      return true;
    }
  };
}

export const loggingService = createLoggingService();
