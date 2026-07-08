import { moderationRepository } from '../../database/mongo/repositories/moderationRepository.js';
import { parseDuration } from '../moderationService.js';
import { loggingService } from '../loggingService.js';

const ACTION_CASE_TYPES = Object.freeze({
  delete: 'automod_delete',
  warn: 'automod_warn',
  timeout: 'automod_timeout'
});

async function deleteMessage(message) {
  if (message.deletable === false || typeof message.delete !== 'function') {
    return false;
  }

  const deleted = await message
    .delete()
    .then(() => true)
    .catch(() => false);
  return deleted;
}

export function createPunishmentExecutor({ moderationRepo = moderationRepository, logService = loggingService } = {}) {
  return {
    async execute({ message, settings, result }) {
      const deleted = await deleteMessage(message);
      const actionType = ACTION_CASE_TYPES[result.action] ?? 'automod_delete';
      let durationMs = null;
      let timeoutDuration = result.timeoutDuration;

      if (result.action === 'timeout') {
        durationMs = parseDuration(timeoutDuration);
        if (!durationMs) {
          timeoutDuration = '10m';
          durationMs = 600000;
        }
      }

      if (result.action === 'timeout' && message.member?.timeout) {
        await message.member.timeout(durationMs, result.reason);
      }

      const moderationCase = await moderationRepo.createCase({
        guildId: message.guild.id,
        targetUserId: message.author.id,
        moderatorId: message.client?.user?.id ?? 'automod',
        actionType,
        reason: result.reason,
        duration: result.action === 'timeout' ? timeoutDuration : null,
        durationMs,
        expiresAt: durationMs ? new Date(Date.now() + durationMs) : null,
        deletedMessageCount: deleted ? 1 : 0,
        metadata: {
          automod: true,
          ruleId: result.ruleId,
          ...result.metadata
        }
      });

      if (settings.automod.logActions) {
        await logService.sendModerationLog({
          guild: message.guild,
          settings,
          moderationCase,
          targetUser: message.author,
          moderatorUser: message.client?.user ?? { id: 'automod', username: 'World Tree Automod' }
        });
      }

      return { ok: true, moderationCase };
    }
  };
}

export const punishmentExecutor = createPunishmentExecutor();
