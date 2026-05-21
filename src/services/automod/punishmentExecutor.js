import { moderationRepository } from '../../database/mongo/repositories/moderationRepository.js';
import { safeLog } from '../../utils/safeLog.js';
import { sanitizeMentions } from '../../utils/sanitize.js';
import { validateTimeoutDuration } from '../../utils/validators.js';
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

  const deleted = await message.delete().then(() => true).catch(() => false);
  return deleted;
}

export function createPunishmentExecutor({
  moderationRepo = moderationRepository,
  logService = loggingService
} = {}) {
  return {
    async execute({ message, settings, result }) {
      const deleted = await deleteMessage(message);
      const actionType = ACTION_CASE_TYPES[result.action] ?? 'automod_delete';
      const timeoutValidation = result.action === 'timeout'
        ? validateTimeoutDuration(result.timeoutDuration)
        : { valid: true, ms: null };
      const durationMs = timeoutValidation.valid ? timeoutValidation.ms : null;
      const reason = sanitizeMentions(result.reason);

      if (result.action === 'timeout' && !timeoutValidation.valid) {
        console.warn('[Automod] Skipping invalid timeout punishment', {
          guildId: message.guild.id,
          ruleId: result.ruleId,
          reason: timeoutValidation.reason
        });
        return { ok: false, skipped: true, reason: timeoutValidation.reason };
      }

      if (result.action === 'timeout' && durationMs && message.member?.timeout) {
        await message.member.timeout(durationMs, reason);
      }

      const moderationCase = await moderationRepo.createCase({
        guildId: message.guild.id,
        targetUserId: message.author.id,
        moderatorId: message.client?.user?.id ?? 'automod',
        actionType,
        reason,
        duration: result.action === 'timeout' ? result.timeoutDuration : null,
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
        safeLog(
          () => logService.sendModerationLog({
            guild: message.guild,
            settings,
            moderationCase,
            targetUser: message.author,
            moderatorUser: message.client?.user ?? { id: 'automod', username: 'World Tree Automod' }
          }),
          { guildId: message.guild.id, action: actionType }
        );
      }

      return { ok: true, moderationCase };
    }
  };
}

export const punishmentExecutor = createPunishmentExecutor();
