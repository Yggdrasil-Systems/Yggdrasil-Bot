function extractSnowflake(value) {
  return value?.match(/\d{17,20}/)?.[0] ?? null;
}

export async function resolveUserFromMessage(message, args, { optional = true } = {}) {
  const firstArg = args[0];

  if (!firstArg && optional) {
    return message.author;
  }

  const mentionedUser = message.mentions.users.first();

  if (mentionedUser) {
    return mentionedUser;
  }

  const userId = extractSnowflake(firstArg);

  if (!userId) {
    return optional ? message.author : null;
  }

  return message.client.users.fetch(userId).catch(() => null);
}

export async function resolveMember(guild, userId) {
  if (!guild || !userId) {
    return null;
  }

  return guild.members.fetch(userId).catch(() => null);
}

export function resolveRoleFromMessage(message, args) {
  const mentionedRole = message.mentions.roles.first();

  if (mentionedRole) {
    return mentionedRole;
  }

  const roleQuery = args.join(' ').trim();
  const roleId = extractSnowflake(roleQuery);

  if (roleId && message.guild.roles.cache.has(roleId)) {
    return message.guild.roles.cache.get(roleId);
  }

  if (!roleQuery) {
    return null;
  }

  return message.guild.roles.cache.find((role) => role.name.toLowerCase() === roleQuery.toLowerCase()) ?? null;
}

export function parsePositiveInteger(value) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}
