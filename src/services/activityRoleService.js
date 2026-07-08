import { ActivityType, PermissionFlagsBits } from 'discord.js';

import { logger } from '../utils/logger.js';

// ─── Activity Matchers ──────────────────────────────────────────────────────
// Each activity type defines a predicate that determines if a user's presence
// matches that activity. This is the extension point for future activity types.
// Adding a new type requires:
//   1. Adding it to ACTIVITY_TYPES in constants
//   2. Adding a matcher here
//   3. Adding it to the schema defaults
// No other changes are needed.

const ACTIVITY_MATCHERS = Object.freeze({
  spotify(activity) {
    return activity.name === 'Spotify' && activity.type === ActivityType.Listening;
  },

  streaming(activity) {
    return activity.type === ActivityType.Streaming;
  },

  gaming(activity) {
    return activity.type === ActivityType.Playing && activity.name !== 'Spotify';
  }
  // Note: voice is handled by voiceStateUpdate, not presenceUpdate
});

function isMatchingActivity(presence, activityType) {
  const matcher = ACTIVITY_MATCHERS[activityType];

  if (!matcher) {
    return false;
  }

  if (!presence?.activities || presence.activities.length === 0) {
    return false;
  }

  return presence.activities.some((activity) => matcher(activity));
}

function isBotAbleToManageRole(botMember, role) {
  if (!botMember || !role) {
    return false;
  }

  const botHighestRole = botMember.roles?.highest;

  if (!botHighestRole) {
    return false;
  }

  // Bot cannot manage a role higher than or equal to its highest role
  if (botHighestRole.position <= role.position) {
    return false;
  }

  // Bot needs Manage Roles permission
  if (!botMember.permissions?.has(PermissionFlagsBits.ManageRoles)) {
    return false;
  }

  return true;
}

function shouldSkipActivityRole(guildMember, role, botMember, log) {
  if (!guildMember) {
    return { skip: true, reason: 'Member not found in guild' };
  }

  if (!role) {
    return { skip: true, reason: 'Configured role not found' };
  }

  if (!isBotAbleToManageRole(botMember, role)) {
    return { skip: true, reason: 'Bot lacks permission or role hierarchy' };
  }

  if (guildMember.user?.bot) {
    return { skip: true, reason: 'Target is a bot' };
  }

  return { skip: false };
}

export function createActivityRoleService({ settingsService = null, log = logger } = {}) {
  async function getConfiguredRole(guild, config) {
    return guild.roles.cache.get(config.roleId) ?? (await guild.roles.fetch(config.roleId).catch(() => null));
  }

  async function applyActivityRoleChange({
    guild,
    guildMember,
    botMember,
    activityType,
    config,
    shouldHaveRole,
    reason
  }) {
    const role = await getConfiguredRole(guild, config);
    const skipCheck = shouldSkipActivityRole(guildMember, role, botMember, log);

    if (skipCheck.skip) {
      log.debug?.(`[ActivityRole] ${activityType}: ${skipCheck.reason} for ${guildMember.user?.tag} in ${guild.name}`);
      return null;
    }

    try {
      if (shouldHaveRole && !guildMember.roles.cache.has(config.roleId)) {
        await guildMember.roles.add(config.roleId, reason.grant);
        log.info?.(`[ActivityRole] Granted ${activityType} role to ${guildMember.user?.tag} in ${guild.name}`);
        return { action: 'granted', activityType, userId: guildMember.id };
      }

      if (!shouldHaveRole && guildMember.roles.cache.has(config.roleId)) {
        await guildMember.roles.remove(config.roleId, reason.remove);
        log.info?.(`[ActivityRole] Removed ${activityType} role from ${guildMember.user?.tag} in ${guild.name}`);
        return { action: 'removed', activityType, userId: guildMember.id };
      }
    } catch (error) {
      log.error?.(
        `[ActivityRole] Failed to manage ${activityType} role for ${guildMember.user?.tag}: ${error.message}`
      );
      return { action: 'failed', activityType, userId: guildMember.id, error: error.message };
    }

    return null;
  }

  return {
    async handlePresenceUpdate(oldPresence, newPresence) {
      if (!newPresence?.guild) {
        return { ok: true, skipped: true };
      }

      const guild = newPresence.guild;
      const guildMember = newPresence.member;
      const botMember = guild.members?.me;

      if (!guildMember || !botMember) {
        return { ok: true, skipped: true };
      }

      const settings = await settingsService?.getEffectiveSettings(guild.id).catch(() => null);
      const activityRoles = settings?.activityRoles ?? {};

      const results = [];

      for (const [activityType, config] of Object.entries(activityRoles)) {
        if (!config?.enabled || !config?.roleId) {
          continue;
        }

        if (activityType === 'voice') {
          continue;
        }

        const hadMatch = isMatchingActivity(oldPresence, activityType);
        const hasMatch = isMatchingActivity(newPresence, activityType);

        if (hadMatch === hasMatch) {
          continue;
        }

        const result = await applyActivityRoleChange({
          guild,
          guildMember,
          botMember,
          activityType,
          config,
          shouldHaveRole: hasMatch,
          reason: {
            grant: `World Tree: ${activityType} activity detected`,
            remove: `World Tree: ${activityType} activity ended`
          }
        });

        if (result) {
          results.push(result);
        }
      }

      return { ok: true, results };
    },

    async handleVoiceStateUpdate(oldState, newState) {
      const guild = newState?.guild ?? oldState?.guild;
      const guildMember = newState?.member ?? oldState?.member;
      const botMember = guild?.members?.me;

      if (!guild || !guildMember || !botMember) {
        return { ok: true, skipped: true };
      }

      const wasInVoice = Boolean(oldState?.channelId);
      const isInVoice = Boolean(newState?.channelId);

      if (wasInVoice === isInVoice) {
        return { ok: true, results: [] };
      }

      const settings = await settingsService?.getEffectiveSettings(guild.id).catch(() => null);
      const config = settings?.activityRoles?.voice;

      if (!config?.enabled || !config?.roleId) {
        return { ok: true, results: [] };
      }

      const result = await applyActivityRoleChange({
        guild,
        guildMember,
        botMember,
        activityType: 'voice',
        config,
        shouldHaveRole: isInVoice,
        reason: {
          grant: 'World Tree: voice activity detected',
          remove: 'World Tree: voice activity ended'
        }
      });

      return { ok: true, results: result ? [result] : [] };
    }
  };
}

export const activityRoleService = createActivityRoleService();
