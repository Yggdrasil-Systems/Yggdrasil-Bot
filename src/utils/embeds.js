import { EmbedBuilder } from 'discord.js';

import { BOT, COLORS } from './constants.js';
import { formatBoolean, formatDiscordTimestamp, formatDuration } from './formatters.js';

export function buildBaseEmbed({ title, description, color = COLORS.brand }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: BOT.name })
    .setTimestamp();

  if (title) {
    embed.setTitle(title);
  }

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

export function buildSuccessEmbed(title, description) {
  return buildBaseEmbed({
    title,
    description,
    color: COLORS.success
  });
}

export function buildErrorEmbed(title, description) {
  return buildBaseEmbed({
    title,
    description,
    color: COLORS.error
  });
}

export function buildNeutralEmbed(title, description) {
  return buildBaseEmbed({
    title,
    description,
    color: COLORS.neutral
  });
}

export function buildPingEmbed(summary) {
  return buildSuccessEmbed('Tree Status', summary.description);
}

export function buildAvatarEmbed(summary) {
  return buildBaseEmbed({
    title: `${summary.displayName}'s Avatar`,
    description: `[Open image](${summary.imageUrl})`
  }).setImage(summary.imageUrl);
}

export function buildBannerEmbed(summary) {
  if (!summary.imageUrl) {
    return buildNeutralEmbed(
      `${summary.displayName}'s Banner`,
      'No profile banner is available for this user.'
    );
  }

  return buildBaseEmbed({
    title: `${summary.displayName}'s Banner`,
    description: `[Open image](${summary.imageUrl})`
  }).setImage(summary.imageUrl);
}

export function buildUserInfoEmbed(summary) {
  const roles = summary.roles.length > 0 ? summary.roles.join(', ') : 'None';

  return buildBaseEmbed({
    title: summary.tag,
    description: `User ID: \`${summary.userId}\``
  })
    .setThumbnail(summary.avatarUrl)
    .addFields(
      { name: 'Account Created', value: formatDiscordTimestamp(summary.createdAt, 'D'), inline: true },
      { name: 'Joined Server', value: formatDiscordTimestamp(summary.joinedAt, 'D'), inline: true },
      { name: 'Bot Account', value: formatBoolean(summary.isBot), inline: true },
      { name: 'Roles', value: roles.slice(0, 1024), inline: false }
    );
}

export function buildServerInfoEmbed(summary) {
  const embed = buildBaseEmbed({
    title: summary.name,
    description: `Server ID: \`${summary.guildId}\``
  }).addFields(
    { name: 'Members', value: `${summary.memberCount}`, inline: true },
    { name: 'Channels', value: `${summary.channelCount}`, inline: true },
    { name: 'Roles', value: `${summary.roleCount}`, inline: true },
    { name: 'Created', value: formatDiscordTimestamp(summary.createdAt, 'D'), inline: true }
  );

  if (summary.iconUrl) {
    embed.setThumbnail(summary.iconUrl);
  }

  return embed;
}

export function buildBotInfoEmbed(summary) {
  return buildBaseEmbed({
    title: summary.tag,
    description: `Bot ID: \`${summary.botId}\``
  })
    .setThumbnail(summary.avatarUrl)
    .addFields(
      { name: 'Servers', value: `${summary.guildCount}`, inline: true },
      { name: 'Gateway', value: `${summary.websocketLatency}ms`, inline: true },
      { name: 'Uptime', value: formatDuration(summary.uptimeMs), inline: true }
    );
}

export function buildRoleInfoEmbed(summary) {
  return buildBaseEmbed({
    title: summary.name,
    description: `Role ID: \`${summary.roleId}\``,
    color: summary.color || COLORS.brand
  }).addFields(
    { name: 'Members', value: `${summary.memberCount}`, inline: true },
    { name: 'Color', value: summary.hexColor, inline: true },
    { name: 'Created', value: formatDiscordTimestamp(summary.createdAt, 'D'), inline: true },
    { name: 'Hoisted', value: formatBoolean(summary.hoist), inline: true },
    { name: 'Mentionable', value: formatBoolean(summary.mentionable), inline: true },
    { name: 'Managed', value: formatBoolean(summary.managed), inline: true }
  );
}
