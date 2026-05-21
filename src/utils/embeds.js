import { EmbedBuilder } from 'discord.js';

import { COLORS as ACTION_COLORS } from '../config/colors.js';
import { BOT, COLORS } from './constants.js';
import { formatBoolean, formatDiscordTimestamp, formatDuration } from './formatters.js';
import { sanitizeMentions } from './sanitize.js';

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
  return buildSuccessEmbed('Tree Status', 'World Tree is responsive.')
    .addFields(
      { name: 'Gateway', value: `${summary.websocketLatency}ms`, inline: true },
      { name: 'Response', value: `${summary.responseLatency}ms`, inline: true }
    );
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

export function buildStatsEmbed(summary) {
  return buildBaseEmbed({
    title: 'World Tree Stats',
    description: 'Current runtime and coverage snapshot.'
  }).addFields(
    { name: 'Servers', value: `${summary.guildCount}`, inline: true },
    { name: 'Members', value: `${summary.memberCount}`, inline: true },
    { name: 'Commands', value: `${summary.commandCount}`, inline: true },
    { name: 'Gateway', value: `${summary.websocketLatency}ms`, inline: true },
    { name: 'Uptime', value: formatDuration(summary.uptimeMs), inline: true }
  );
}

export function buildMemberCountEmbed(summary) {
  return buildBaseEmbed({
    title: 'Member Count',
    description: `${summary.name} has ${summary.memberCount} member(s).`
  });
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

export function buildModerationResultEmbed(title, moderationCase) {
  const actionColor = {
    ban: ACTION_COLORS.BAN,
    kick: ACTION_COLORS.KICK,
    timeout: ACTION_COLORS.TIMEOUT,
    warn: ACTION_COLORS.WARN,
    untimeout: ACTION_COLORS.RESOLVE
  }[moderationCase.actionType] ?? COLORS.success;

  return buildBaseEmbed({
    title,
    description: `Case #${moderationCase.caseId} recorded for user \`${moderationCase.targetUserId}\`.`,
    color: actionColor
  });
}

export function buildWarningsEmbed({ targetUser, warnings }) {
  const description = warnings.length === 0
    ? 'No warnings are recorded for this user.'
    : warnings
      .slice(0, 8)
      .map((warning) => `#${warning.caseId} - ${sanitizeMentions(warning.reason) || 'None'}`)
      .join('\n');

  return buildBaseEmbed({
    title: `Warnings for ${targetUser.tag ?? targetUser.username}`,
    description
  });
}

export function buildModerationLogEmbed({ moderationCase, targetUser, moderatorUser }) {
  const targetValue = moderationCase.metadata?.targetType === 'channel'
    ? `<#${moderationCase.metadata.channelId ?? moderationCase.targetUserId}>\n\`${moderationCase.targetUserId}\``
    : `${targetUser.tag ?? targetUser.username}\n\`${moderationCase.targetUserId}\``;

  const embed = buildBaseEmbed({
    title: `Moderation Case #${moderationCase.caseId}`,
    description: `Action: \`${moderationCase.actionType}\``,
    color: COLORS.warning
  }).addFields(
    { name: 'Target', value: targetValue, inline: true },
    { name: 'Moderator', value: `${moderatorUser.tag ?? moderatorUser.username}\n\`${moderationCase.moderatorId}\``, inline: true },
    { name: 'Reason', value: sanitizeMentions(moderationCase.reason) || 'None', inline: false }
  );

  if (moderationCase.duration) {
    embed.addFields({ name: 'Duration', value: moderationCase.duration, inline: true });
  }

  if (Number.isInteger(moderationCase.deletedMessageCount)) {
    embed.addFields({ name: 'Messages Deleted', value: `${moderationCase.deletedMessageCount}`, inline: true });
  }

  return embed;
}

export function buildSettingsEmbed(settings) {
  const trustedRoles = settings.trustedAdminRoleIds?.length
    ? settings.trustedAdminRoleIds.map((roleId) => `<@&${roleId}>`).join(', ')
    : 'None configured';

  return buildBaseEmbed({
    title: 'World Tree Settings',
    description: `Server ID: \`${settings.guildId}\``
  }).addFields(
    { name: 'Mod Log', value: settings.modLogChannelId ? `<#${settings.modLogChannelId}>` : 'Not configured', inline: true },
    { name: 'Automod', value: formatBoolean(settings.automod.enabled), inline: true },
    { name: 'Trusted Admin Roles', value: trustedRoles.slice(0, 1024), inline: false }
  );
}

export function buildAutomodSettingsEmbed(settings) {
  const rules = Object.entries(settings.automod.rules)
    .map(([name, rule]) => {
      const threshold = rule.threshold ? `, threshold ${rule.threshold}` : '';
      return `\`${name}\`: ${rule.enabled ? 'on' : 'off'} (${rule.punishment?.action ?? 'delete'}${threshold})`;
    })
    .join('\n');

  return buildBaseEmbed({
    title: 'Automod Settings',
    description: settings.automod.enabled ? 'Automod is enabled.' : 'Automod is disabled.'
  }).addFields(
    { name: 'Rules', value: rules || 'No rules configured.', inline: false },
    { name: 'Logging', value: formatBoolean(settings.automod.logActions), inline: true }
  );
}

export function buildCaseEmbed(moderationCase) {
  if (!moderationCase) {
    return buildErrorEmbed('Case not found', 'No matching moderation case was found.');
  }

  return buildBaseEmbed({
    title: `Moderation Case #${moderationCase.caseId}`,
    description: `Action: \`${moderationCase.actionType}\``
  }).addFields(
    { name: 'Target', value: `<@${moderationCase.targetUserId}>`, inline: true },
    { name: 'Moderator', value: `<@${moderationCase.moderatorId}>`, inline: true },
    { name: 'Status', value: moderationCase.status, inline: true },
    { name: 'Reason', value: sanitizeMentions(moderationCase.reason) || 'None', inline: false }
  );
}

export function buildCaseListEmbed(cases) {
  const pageCases = cases.slice(0, 10);
  const description = cases.length
    ? pageCases.map((moderationCase) => `#${moderationCase.caseId} \`${moderationCase.actionType}\` \`${moderationCase.targetUserId}\` - ${sanitizeMentions(moderationCase.reason) || 'None'}`).join('\n').slice(0, 4096)
    : 'No moderation cases found.';

  const embed = buildBaseEmbed({
    title: 'Moderation Cases',
    description
  });

  if (cases.length > 10) {
    embed.setFooter({ text: `${BOT.name} | Page 1 of ${Math.ceil(cases.length / 10)}` });
  }

  return embed;
}

export function buildCaseStatsEmbed(stats) {
  const byActionSource = {
    warn: stats.byAction?.warn ?? 0,
    kick: stats.byAction?.kick ?? 0,
    ban: stats.byAction?.ban ?? 0,
    timeout: stats.byAction?.timeout ?? 0
  };
  const byAction = Object.entries(byActionSource)
    .map(([action, count]) => `\`${action}\`: ${count}`)
    .join('\n');

  const mostRecent = stats.mostRecentCaseDate ?? stats.mostRecentCreatedAt ?? stats.latestCreatedAt ?? null;

  return buildBaseEmbed({
    title: 'Moderation Case Stats',
    description: 'Current moderation case totals.'
  }).addFields(
    { name: 'Total Cases', value: `${stats.total ?? 0}`, inline: true },
    { name: 'Open Cases', value: `${stats.byStatus?.open ?? stats.open ?? 0}`, inline: true },
    { name: 'Cases By Type', value: byAction, inline: false },
    { name: 'Most Recent Case', value: mostRecent ? formatDiscordTimestamp(mostRecent, 'D') : 'None', inline: true }
  );
}

export function buildDashboardEmbed({ dashboardUrl }) {
  return buildBaseEmbed({
    title: 'World Tree Dashboard',
    description: dashboardUrl
      ? `Dashboard foundation is available at ${dashboardUrl}.`
      : 'Dashboard contracts and planning are scaffolded. A production web dashboard is not enabled yet.'
  }).addFields(
    { name: 'Current Scope', value: 'Settings, automod, moderation cases, and API contracts are prepared for a future web surface.' }
  );
}
