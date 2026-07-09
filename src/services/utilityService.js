import os from 'os';
import { formatHexColor } from '../utils/formatters.js';

function clampLatency(value) {
  const latency = Math.round(Number(value));
  return Number.isFinite(latency) && latency > 0 ? latency : 0;
}

export function getPingSummary(clientOrInteraction) {
  const client = clientOrInteraction.client ?? clientOrInteraction;
  const websocketLatency = clampLatency(client.ws.ping);
  const responseLatency = clientOrInteraction.createdTimestamp
    ? clampLatency(Date.now() - clientOrInteraction.createdTimestamp)
    : 0;

  return {
    websocketLatency,
    responseLatency,
    clientAvatarUrl: client.user?.displayAvatarURL({ size: 1024, extension: 'png' }),
    description: `Gateway latency: ${websocketLatency}ms\nResponse time: ${responseLatency}ms`
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
  const memoryUsage = process.memoryUsage();
  const totalMemMb = (os.totalmem() / 1024 / 1024).toFixed(2);
  const usedMemMb = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
  const cpuLoad = os.loadavg()[0].toFixed(2);
  const cpuModel = os.cpus()[0]?.model || 'Unknown CPU';
  const botUser = client.user;
  const guilds = client.guilds?.cache;
  const channels = client.channels?.cache;
  const guildCount = guilds?.size ?? 0;
  const channelCount = channels?.size ?? 0;
  const userCount = guilds
    ? typeof guilds.reduce === 'function'
      ? guilds.reduce((acc, guild) => acc + (guild.memberCount || 0), 0)
      : [...guilds.values()].reduce((acc, guild) => acc + (guild.memberCount || 0), 0)
    : 0;
  const websocketLatency = client.ws?.ping ?? 0;

  return {
    botId: botUser?.id ?? 'unknown',
    tag: botUser?.tag ?? 'Unknown Bot',
    guildCount,
    channelCount,
    userCount,
    websocketLatency: Math.round(websocketLatency),
    uptimeMs,
    avatarUrl: botUser?.displayAvatarURL?.({ size: 256, extension: 'png' }) ?? null,
    cpuModel,
    cpuUsage: cpuLoad,
    memoryUsed: usedMemMb,
    memoryTotal: totalMemMb,
    platform: os.platform(),
    discordJsVersion: '14.26.4', // Could also require package.json but hardcoding based on the codebase is simpler
    nodeVersion: process.version
  };
}

export function getStatsSummary({ client, uptimeMs = process.uptime() * 1000 }) {
  const cache = client.guilds?.cache;
  const memberCount = cache
    ? typeof cache.reduce === 'function'
      ? cache.reduce((total, guild) => total + (guild.memberCount ?? 0), 0)
      : [...cache.values()].reduce((total, guild) => total + (guild.memberCount ?? 0), 0)
    : 0;

  return {
    guildCount: cache?.size ?? 0,
    memberCount,
    commandCount: client.commands?.size ?? 0,
    websocketLatency: Math.round(client.ws?.ping ?? 0),
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
