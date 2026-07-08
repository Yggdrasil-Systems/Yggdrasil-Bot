import { PermissionsBitField } from 'discord.js';

export function hasPermission(member, permission) {
  return Boolean(member?.permissions?.has(permission));
}

export function hasTrustedAdminRole(member, trustedAdminRoleIds = []) {
  if (!member?.roles?.cache || trustedAdminRoleIds.length === 0) {
    return false;
  }

  return trustedAdminRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

export function canUseAdminCommand({
  userId,
  guildOwnerId,
  botOwnerId,
  member,
  trustedAdminRoleIds = []
}) {
  if (!userId) {
    return false;
  }

  return userId === guildOwnerId
    || userId === botOwnerId
    || hasPermission(member, PermissionsBitField.Flags.Administrator)
    || hasPermission(member, PermissionsBitField.Flags.ManageGuild)
    || hasTrustedAdminRole(member, trustedAdminRoleIds);
}

export function canUseNoPrefixShortcuts(context) {
  if (!context?.userId) {
    return false;
  }

  return context.userId === context.botOwnerId || Boolean(context.noPrefixAllowed);
}

export function canRunModerationAction(member, permission) {
  return hasPermission(member, permission) || hasPermission(member, PermissionsBitField.Flags.Administrator);
}
