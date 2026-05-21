import { PermissionsBitField } from 'discord.js';
import { moderationRepository } from '../database/mongo/repositories/moderationRepository.js';
import { settingsRepository } from '../database/mongo/repositories/settingsRepository.js';
import { LIMITS } from '../utils/constants.js';
import { safeLog } from '../utils/safeLog.js';
import { sanitizeMentions } from '../utils/sanitize.js';
import { validateTimeoutDuration } from '../utils/validators.js';
import { normalizeGuildSettings } from './settingsService.js';
import { loggingService } from './loggingService.js';

const ACTION_PERMISSIONS = Object.freeze({
  warn: PermissionsBitField.Flags.ModerateMembers,
  timeout: PermissionsBitField.Flags.ModerateMembers,
  untimeout: PermissionsBitField.Flags.ModerateMembers,
  kick: PermissionsBitField.Flags.KickMembers,
  ban: PermissionsBitField.Flags.BanMembers,
  purge: PermissionsBitField.Flags.ManageMessages
});

function hasPermission(member, permission) {
  return Boolean(member?.permissions?.has(permission) || member?.permissions?.has(PermissionsBitField.Flags.Administrator));
}

function normalizeReason(reason) {
  return sanitizeMentions(String(reason ?? '').trim());
}

function fail(reason) {
  return { ok: false, reason };
}

function canModerateTarget({ guild, moderatorMember, targetMember }) {
  if (!targetMember) {
    return true;
  }

  if (targetMember.id === guild.ownerId) {
    return false;
  }

  if (moderatorMember?.id === guild.ownerId) {
    return true;
  }

  const moderatorPosition = moderatorMember?.roles?.highest?.position ?? 0;
  const targetPosition = targetMember?.roles?.highest?.position ?? 0;

  return moderatorPosition > targetPosition;
}

function canBotActOnTarget(targetMember, capability) {
  if (!targetMember) {
    return true;
  }

  return targetMember[capability] !== false;
}

function validateModerationRequest({ actionType, guild, moderatorMember, targetMember, reason, targetCapability, settings }) {
  if (!guild) {
    return 'This command can only be used in a server.';
  }

  if (!hasPermission(moderatorMember, ACTION_PERMISSIONS[actionType])) {
    return 'You do not have permission to use that moderation action.';
  }

  if (settings?.moderation?.requireReason !== false && !normalizeReason(reason)) {
    return 'A reason is required for this moderation action.';
  }

  if (targetMember?.id === moderatorMember?.id) {
    return 'You cannot use this moderation action on yourself.';
  }

  if (targetCapability && !targetMember && actionType !== 'ban') {
    return 'That user must be in this server for this moderation action.';
  }

  if (!canModerateTarget({ guild, moderatorMember, targetMember })) {
    return 'You cannot act on a member with an equal or higher role.';
  }

  if (targetCapability && !canBotActOnTarget(targetMember, targetCapability)) {
    return 'World Tree cannot act on that member. Check role hierarchy and bot permissions.';
  }

  return null;
}

function effectiveReason(reason, settings, fallback = 'No reason provided.') {
  return normalizeReason(reason) || (settings?.moderation?.requireReason === false ? fallback : '');
}

async function getGuildSettings(guild, dependencies, providedSettings = null) {
  if (providedSettings) {
    return normalizeGuildSettings(providedSettings);
  }

  if (!guild?.id) {
    return normalizeGuildSettings({});
  }

  return normalizeGuildSettings(await dependencies.settingsRepository.getOrCreate(guild.id));
}

async function createAndLogCase({
  actionType,
  guild,
  targetUser,
  moderatorUser,
  payload,
  settings,
  dependencies
}) {
  const moderationCase = await dependencies.moderationRepository.createCase({
    guildId: guild.id,
    targetUserId: targetUser.id,
    moderatorId: moderatorUser.id,
    actionType,
    ...payload
  });
  if (settings?.moderation?.caseLogEnabled !== false) {
    // PERF FIX: Moderation actions now complete and return immediately after case creation;
    // mod-log delivery is isolated so a deleted channel or Discord API failure cannot fail the action.
    safeLog(
      () => dependencies.loggingService.sendModerationLog({
        guild,
        settings,
        moderationCase,
        targetUser,
        moderatorUser
      }),
      { guildId: guild.id, action: actionType }
    );
  }

  return { ok: true, moderationCase };
}

export function validatePurgeAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    return 'Amount must be a positive number.';
  }

  if (amount > LIMITS.maxPurgeAmount) {
    return `Amount cannot exceed ${LIMITS.maxPurgeAmount} messages.`;
  }

  return null;
}

export function parseDuration(duration) {
  const result = validateTimeoutDuration(duration);
  return result.valid ? result.ms : null;
}

export function canBotManageMessages(message) {
  return Boolean(
    message.guild?.members?.me
      ?.permissionsIn(message.channel)
      ?.has(PermissionsBitField.Flags.ManageMessages)
  );
}

export function createModerationService({
  moderationRepository: moderationRepo = moderationRepository,
  settingsRepository: settingsRepo = settingsRepository,
  loggingService: logService = loggingService
} = {}) {
  const dependencies = {
    moderationRepository: moderationRepo,
    settingsRepository: settingsRepo,
    loggingService: logService
  };

  return {
    async warn({ guild, moderatorMember, targetMember, targetUser = targetMember?.user, reason, settings: providedSettings = null }) {
      const settings = await getGuildSettings(guild, dependencies, providedSettings);
      const finalReason = effectiveReason(reason, settings);
      const validationError = validateModerationRequest({
        actionType: 'warn',
        guild,
        moderatorMember,
        targetMember,
        targetCapability: 'manageable',
        reason: finalReason,
        settings
      });

      if (validationError) {
        return fail(validationError);
      }

      return createAndLogCase({
        actionType: 'warn',
        guild,
        targetUser,
        moderatorUser: moderatorMember.user,
        payload: { reason: finalReason },
        settings,
        dependencies
      });
    },

    async warnings({ guildId, targetUserId }) {
      const warnings = await dependencies.moderationRepository.listWarnings(guildId, targetUserId);
      return { ok: true, warnings };
    },

    async getCase({ guildId, caseId }) {
      const moderationCase = await dependencies.moderationRepository.getCaseById(guildId, caseId);
      return moderationCase
        ? { ok: true, moderationCase }
        : fail('No matching moderation case was found.');
    },

    async listCases({ guildId, targetUserId = null, limit = 10, filters = {} }) {
      const cases = await dependencies.moderationRepository.listCases(guildId, targetUserId, limit, filters);
      return { ok: true, cases };
    },

    async resolveCase({ guildId, caseId, resolvedBy, resolutionReason = 'Resolved' }) {
      const moderationCase = await dependencies.moderationRepository.resolveCase({
        guildId,
        caseId,
        resolvedBy,
        resolutionReason: normalizeReason(resolutionReason) || 'Resolved'
      });

      return moderationCase
        ? { ok: true, moderationCase }
        : fail('No matching moderation case was found.');
    },

    async deleteCase({ guildId, caseId, resolvedBy, resolutionReason = 'Deleted' }) {
      const moderationCase = await dependencies.moderationRepository.softDeleteCase({
        guildId,
        caseId,
        resolvedBy,
        resolutionReason: normalizeReason(resolutionReason) || 'Deleted'
      });

      return moderationCase
        ? { ok: true, moderationCase }
        : fail('No matching moderation case was found.');
    },

    async getCaseStats({ guildId }) {
      return { ok: true, stats: await dependencies.moderationRepository.getCaseStats(guildId) };
    },

    async timeout({ guild, moderatorMember, targetMember, duration, reason, settings: providedSettings = null }) {
      const durationValidation = validateTimeoutDuration(duration);
      const durationMs = durationValidation.valid ? durationValidation.ms : null;
      const settings = await getGuildSettings(guild, dependencies, providedSettings);
      const finalReason = effectiveReason(reason, settings);

      if (!durationValidation.valid) {
        return fail(durationValidation.reason);
      }

      const validationError = validateModerationRequest({
        actionType: 'timeout',
        guild,
        moderatorMember,
        targetMember,
        targetCapability: 'moderatable',
        reason: finalReason,
        settings
      });

      if (validationError) {
        return fail(validationError);
      }

      await targetMember.timeout(durationMs, finalReason);

      return createAndLogCase({
        actionType: 'timeout',
        guild,
        targetUser: targetMember.user,
        moderatorUser: moderatorMember.user,
        payload: {
          reason: finalReason,
          duration,
          durationMs,
          expiresAt: new Date(Date.now() + durationMs)
        },
        settings,
        dependencies
      });
    },

    async untimeout({ guild, moderatorMember, targetMember, reason = 'Timeout removed', settings: providedSettings = null }) {
      const settings = await getGuildSettings(guild, dependencies, providedSettings);
      const finalReason = effectiveReason(reason, settings, 'Timeout removed');
      const validationError = validateModerationRequest({
        actionType: 'untimeout',
        guild,
        moderatorMember,
        targetMember,
        targetCapability: 'moderatable',
        reason: finalReason,
        settings
      });

      if (validationError) {
        return fail(validationError);
      }

      await targetMember.timeout(null, finalReason);

      return createAndLogCase({
        actionType: 'untimeout',
        guild,
        targetUser: targetMember.user,
        moderatorUser: moderatorMember.user,
        payload: { reason: finalReason, status: 'resolved' },
        settings,
        dependencies
      });
    },

    async kick({ guild, moderatorMember, targetMember, reason, settings: providedSettings = null }) {
      const settings = await getGuildSettings(guild, dependencies, providedSettings);
      const finalReason = effectiveReason(reason, settings);
      const validationError = validateModerationRequest({
        actionType: 'kick',
        guild,
        moderatorMember,
        targetMember,
        targetCapability: 'kickable',
        reason: finalReason,
        settings
      });

      if (validationError) {
        return fail(validationError);
      }

      await targetMember.kick(finalReason);

      return createAndLogCase({
        actionType: 'kick',
        guild,
        targetUser: targetMember.user,
        moderatorUser: moderatorMember.user,
        payload: { reason: finalReason, status: 'resolved' },
        settings,
        dependencies
      });
    },

    async ban({ guild, moderatorMember, targetMember, targetUser = targetMember?.user, reason, settings: providedSettings = null }) {
      const settings = await getGuildSettings(guild, dependencies, providedSettings);
      const finalReason = effectiveReason(reason, settings);
      const validationError = validateModerationRequest({
        actionType: 'ban',
        guild,
        moderatorMember,
        targetMember,
        targetCapability: 'bannable',
        reason: finalReason,
        settings
      });

      if (validationError) {
        return fail(validationError);
      }

      await guild.members.ban(targetUser.id, { reason: finalReason });

      return createAndLogCase({
        actionType: 'ban',
        guild,
        targetUser,
        moderatorUser: moderatorMember.user,
        payload: { reason: finalReason, status: 'resolved' },
        settings,
        dependencies
      });
    },

    async purge({ message, moderatorMember, amount, reason = 'Message purge', settings: providedSettings = null }) {
      const settings = await getGuildSettings(message.guild, dependencies, providedSettings);
      const validationError = validatePurgeAmount(amount);

      if (validationError) {
        return fail(validationError);
      }

      if (!hasPermission(moderatorMember, ACTION_PERMISSIONS.purge)) {
        return fail('You need Manage Messages permission to purge messages.');
      }

      if (!canBotManageMessages(message)) {
        return fail('World Tree needs Manage Messages permission in this channel.');
      }

      const deletedMessages = await message.channel.bulkDelete(amount, true);

      return createAndLogCase({
        actionType: 'purge',
        guild: message.guild,
        targetUser: {
          id: message.channel.id,
          username: message.channel.name ? `#${message.channel.name}` : 'Channel'
        },
        moderatorUser: moderatorMember.user,
        payload: {
          reason: normalizeReason(reason),
          status: 'resolved',
          deletedMessageCount: deletedMessages.size,
          metadata: {
            targetType: 'channel',
            channelId: message.channel.id
          }
        },
        settings,
        dependencies
      });
    }
  };
}

export const moderationService = createModerationService();

export async function purgeMessages({ message, amount }) {
  const result = await moderationService.purge({
    message,
    moderatorMember: message.member,
    amount
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    deletedCount: result.moderationCase.deletedMessageCount,
    moderationCase: result.moderationCase
  };
}
