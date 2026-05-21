import { formatHexColor } from '../utils/formatters.js';

export function getPingSummary(clientOrInteraction) {
  const client = clientOrInteraction.client ?? clientOrInteraction;
  const websocketLatency = Math.round(client.ws.ping);

  return {
    websocketLatency,
    description: `Gateway latency: ${websocketLatency}ms`
  };
}

export function getAvatarSummary({ user }) {
  return {
    userId: user.id,
    displayName: user.displayName ?? user.username,
    imageUrl: user.displayAvatarURL({ size: 1024, extension: 'png' })
  };
}

export function getBannerSummary({ user }) {
  const imageUrl = user.bannerURL?.({ size: 1024, extension: 'png' }) ?? null;

  return {
    userId: user.id,
    displayName: user.displayName ?? user.username,
    imageUrl
  };
}

function getRoleNames(member, guildId) {
  if (!member?.roles?.cache) {
    return [];
  }

  return [...member.roles.cache.values()]
    .filter((role) => role.id !== guildId)
    .sort((left, right) => right.position - left.position)
    .map((role) => role.name)
    .slice(0, 8);
}

export function getUserInfoSummary({ user, member = null, guildId }) {
  return {
    userId: user.id,
    tag: user.tag ?? user.username,
    username: user.username,
    isBot: Boolean(user.bot),
    createdAt: user.createdAt,
    joinedAt: member?.joinedAt ?? null,
    roles: getRoleNames(member, guildId),
    avatarUrl: user.displayAvatarURL({ size: 256, extension: 'png' })
  };
}

export function getServerInfoSummary({ guild }) {
  return {
    guildId: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    channelCount: guild.channels.cache.size,
    roleCount: guild.roles.cache.size,
    createdAt: guild.createdAt,
    iconUrl: guild.iconURL({ size: 256, extension: 'png' })
  };
}

export function getBotInfoSummary({ client, uptimeMs = process.uptime() * 1000 }) {
  return {
    botId: client.user.id,
    tag: client.user.tag,
    guildCount: client.guilds.cache.size,
    websocketLatency: Math.round(client.ws.ping),
    uptimeMs,
    avatarUrl: client.user.displayAvatarURL({ size: 256, extension: 'png' })
  };
}

export function getStatsSummary({ client, uptimeMs = process.uptime() * 1000 }) {
  const guilds = [...client.guilds.cache.values()];

  return {
    guildCount: guilds.length,
    memberCount: guilds.reduce((total, guild) => total + (guild.memberCount ?? 0), 0),
    commandCount: client.commands?.size ?? 0,
    websocketLatency: Math.round(client.ws.ping),
    uptimeMs
  };
}

export function getMemberCountSummary({ guild }) {
  return {
    guildId: guild.id,
    name: guild.name,
    memberCount: guild.memberCount
  };
}

export function getRoleInfoSummary({ role }) {
  return {
    roleId: role.id,
    name: role.name,
    memberCount: role.members?.size ?? 0,
    hexColor: formatHexColor(role.color),
    color: role.color,
    hoist: role.hoist,
    mentionable: role.mentionable,
    managed: role.managed,
    createdAt: role.createdAt
  };
}
