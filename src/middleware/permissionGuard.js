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
    || hasTrustedAdminRole(member, trustedAdminRoleIds);
}

export function canUseNoPrefixShortcuts(context) {
  return canUseAdminCommand(context);
}

export function canRunModerationAction(member, permission) {
  return hasPermission(member, permission) || hasPermission(member, PermissionsBitField.Flags.Administrator);
}
