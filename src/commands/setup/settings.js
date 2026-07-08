import { ChannelType, PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { settingsService } from '../../services/settingsService.js';
import {
  buildAutomodSettingsEmbed,
  buildErrorEmbed,
  buildNeutralEmbed,
  buildSettingsEmbed,
  buildSuccessEmbed
} from '../../utils/embeds.js';
import { ACTIVITY_TYPE_LABELS } from '../../utils/constants.js';
import { parsePositiveInteger, resolveRoleFromMessage } from '../../utils/discordResolvers.js';
import { replyToInteraction } from '../../utils/responses.js';

const RULE_CHOICES = [
  { name: 'Bad words', value: 'badWords' },
  { name: 'Mention spam', value: 'mentionSpam' },
  { name: 'Repeat spam', value: 'repeatSpam' },
  { name: 'Link spam', value: 'linkSpam' },
  { name: 'Caps spam', value: 'capsSpam' }
];

const ACTION_CHOICES = [
  { name: 'Delete', value: 'delete' },
  { name: 'Warn', value: 'warn' },
  { name: 'Timeout', value: 'timeout' }
];

function buildActivityRoleSummaryEmbed(settings) {
  const activityRoles = Object.entries(settings.activityRoles ?? {})
    .map(([type, config]) => {
      const label = ACTIVITY_TYPE_LABELS[type] ?? type;
      const status = config.enabled && config.roleId ? `✅ <@&${config.roleId}>` : '❌ Disabled';
      return `${label}: ${status}`;
    })
    .join('\n');

  return buildNeutralEmbed('Activity Roles', activityRoles || 'No activity roles configured.');
}

export const name = 'settings';
export const aliases = ['config'];
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('View and configure World Tree server settings.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addSubcommand((subcommand) => subcommand.setName('view').setDescription('View current server settings.'))
  .addSubcommandGroup((group) =>
    group
      .setName('trusted-role')
      .setDescription('Manage trusted admin roles.')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Add a trusted admin role.')
          .addRoleOption((option) => option.setName('role').setDescription('Trusted role.').setRequired(true))
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('remove')
          .setDescription('Remove a trusted admin role.')
          .addRoleOption((option) => option.setName('role').setDescription('Trusted role.').setRequired(true))
      )
      .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List trusted admin roles.'))
  )
  .addSubcommandGroup((group) =>
    group
      .setName('automod')
      .setDescription('Configure automod.')
      .addSubcommand((subcommand) => subcommand.setName('view').setDescription('View automod settings.'))
      .addSubcommand((subcommand) =>
        subcommand
          .setName('toggle')
          .setDescription('Enable or disable automod.')
          .addBooleanOption((option) =>
            option.setName('enabled').setDescription('Whether automod is enabled.').setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('threshold')
          .setDescription('Set an automod rule threshold.')
          .addStringOption((option) =>
            option
              .setName('rule')
              .setDescription('Automod rule.')
              .setRequired(true)
              .addChoices(...RULE_CHOICES)
          )
          .addIntegerOption((option) =>
            option.setName('value').setDescription('Threshold value.').setRequired(true).setMinValue(1)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('punishment')
          .setDescription('Set an automod rule punishment.')
          .addStringOption((option) =>
            option
              .setName('rule')
              .setDescription('Automod rule.')
              .setRequired(true)
              .addChoices(...RULE_CHOICES)
          )
          .addStringOption((option) =>
            option
              .setName('action')
              .setDescription('Punishment action.')
              .setRequired(true)
              .addChoices(...ACTION_CHOICES)
          )
          .addStringOption((option) =>
            option.setName('duration').setDescription('Timeout duration when action is timeout.')
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('badword')
          .setDescription('Manage blocked words.')
          .addStringOption((option) =>
            option
              .setName('action')
              .setDescription('Bad word action.')
              .setRequired(true)
              .addChoices(
                { name: 'Add', value: 'add' },
                { name: 'Remove', value: 'remove' },
                { name: 'List', value: 'list' }
              )
          )
          .addStringOption((option) => option.setName('word').setDescription('Word to add or remove.'))
      )
  );

async function handleSettingsAction({ guildId, group, subcommand, values }) {
  if (!group && subcommand === 'view') {
    return { embed: buildSettingsEmbed(await settingsService.getEffectiveSettings(guildId)) };
  }

  if (group === 'trusted-role') {
    if (subcommand === 'add') {
      await settingsService.addTrustedAdminRole(guildId, values.roleId);
      return {
        embed: buildSuccessEmbed(
          'Trusted role added',
          `<@&${values.roleId}> can now use privileged World Tree commands.`
        )
      };
    }

    if (subcommand === 'remove') {
      await settingsService.removeTrustedAdminRole(guildId, values.roleId);
      return {
        embed: buildSuccessEmbed(
          'Trusted role removed',
          `<@&${values.roleId}> no longer has trusted World Tree access.`
        )
      };
    }

    return { embed: buildSettingsEmbed(await settingsService.getEffectiveSettings(guildId)) };
  }

  if (group === 'automod') {
    if (subcommand === 'view') {
      return { embed: buildAutomodSettingsEmbed(await settingsService.getEffectiveSettings(guildId)) };
    }

    if (subcommand === 'toggle') {
      const settings = await settingsService.setAutomodEnabled(guildId, values.enabled);
      return {
        embed: buildSuccessEmbed(
          'Automod updated',
          `Automod is now ${settings.automod.enabled ? 'enabled' : 'disabled'}.`
        )
      };
    }

    if (subcommand === 'threshold') {
      await settingsService.updateAutomodThreshold(guildId, values.rule, values.value);
      return {
        embed: buildSuccessEmbed('Automod threshold updated', `\`${values.rule}\` threshold is now ${values.value}.`)
      };
    }

    if (subcommand === 'punishment') {
      await settingsService.updateAutomodPunishment(guildId, values.rule, {
        action: values.action,
        timeoutDuration: values.duration ?? '10m'
      });
      return {
        embed: buildSuccessEmbed('Automod punishment updated', `\`${values.rule}\` now uses \`${values.action}\`.`)
      };
    }

    if (subcommand === 'badword') {
      if (values.action === 'add') {
        await settingsService.addBadWord(guildId, values.word);
        return { embed: buildSuccessEmbed('Blocked word added', 'The word was added to the bad word filter.') };
      }

      if (values.action === 'remove') {
        await settingsService.removeBadWord(guildId, values.word);
        return { embed: buildSuccessEmbed('Blocked word removed', 'The word was removed from the bad word filter.') };
      }

      const settings = await settingsService.getEffectiveSettings(guildId);
      const words = settings.automod.rules.badWords.words;
      return {
        embed: buildSuccessEmbed(
          'Blocked words',
          words.length ? words.map((word) => `\`${word}\``).join(', ') : 'No blocked words configured.'
        )
      };
    }
  }

  if (group === 'activityrole') {
    if (subcommand === 'set') {
      await settingsService.setActivityRole(guildId, values.activityType, { enabled: true, roleId: values.roleId });
      return {
        embed: buildSuccessEmbed(
          'Activity role configured',
          `${values.activityType} role is now set to <@&${values.roleId}>.`
        )
      };
    }

    if (subcommand === 'remove') {
      await settingsService.removeActivityRole(guildId, values.activityType);
      return {
        embed: buildSuccessEmbed('Activity role removed', `${values.activityType} activity role is now disabled.`)
      };
    }
  }

  return { embed: buildErrorEmbed('Settings unavailable', 'That settings action is not available.') };
}

export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();
  const result = await handleSettingsActionSafely({
    guildId: interaction.guild.id,
    group,
    subcommand,
    values: {
      channelId: interaction.options.getChannel('channel')?.id,
      roleId: interaction.options.getRole('role')?.id,
      enabled: interaction.options.getBoolean('enabled'),
      rule: interaction.options.getString('rule'),
      value: interaction.options.getInteger('value'),
      action: interaction.options.getString('action'),
      duration: interaction.options.getString('duration'),
      word: interaction.options.getString('word')
    }
  });

  await replyToInteraction(interaction, { embeds: [result.embed] }, { ephemeral: true });
}

export async function executeMessage(context) {
  const [section = 'view', action, ...rest] = context.args;
  let result;

  if (section === 'view') {
    result = await handleSettingsActionSafely({ guildId: context.guild.id, subcommand: 'view', values: {} });
  } else if (section === 'automod') {
    result = await handleAutomodMessage(context, action, rest);
  } else if (section === 'activityrole' || section === 'activity-role') {
    result = await handleActivityRoleMessage(context, action, rest);
  } else {
    result = {
      embed: buildErrorEmbed(
        'Settings unavailable',
        'Use `tree settings view`, `tree automod ...`, or `tree activityrole ...`.'
      )
    };
  }

  await context.respond({ embeds: [result.embed] });
}

async function handleActivityRoleMessage(context, action, rest) {
  if (action === 'list' || !action) {
    const settings = await settingsService.getEffectiveSettings(context.guild.id);
    return { embed: buildActivityRoleSummaryEmbed(settings) };
  }

  if (action === 'set') {
    const activityType = rest[0];
    const VALID_TYPES = ['spotify', 'streaming', 'gaming', 'voice'];

    if (!VALID_TYPES.includes(activityType)) {
      return {
        embed: buildErrorEmbed('Invalid activity type', `Use: \`spotify\`, \`streaming\`, \`gaming\`, or \`voice\`.`)
      };
    }

    const role = resolveRoleFromMessage(context.message, rest.slice(1));

    if (!role) {
      return {
        embed: buildErrorEmbed(
          'Role required',
          'Mention a role or provide a role name.\n`tree activityrole set spotify @Role`'
        )
      };
    }

    return handleSettingsActionSafely({
      guildId: context.guild.id,
      group: 'activityrole',
      subcommand: 'set',
      values: { activityType, roleId: role.id }
    });
  }

  if (action === 'remove') {
    const activityType = rest[0];
    const VALID_TYPES = ['spotify', 'streaming', 'gaming', 'voice'];

    if (!VALID_TYPES.includes(activityType)) {
      return {
        embed: buildErrorEmbed('Invalid activity type', `Use: \`spotify\`, \`streaming\`, \`gaming\`, or \`voice\`.`)
      };
    }

    return handleSettingsActionSafely({
      guildId: context.guild.id,
      group: 'activityrole',
      subcommand: 'remove',
      values: { activityType }
    });
  }

  return {
    embed: buildErrorEmbed('Activity role action unavailable', 'Use `list`, `set <type> @role`, or `remove <type>`.')
  };
}

async function handleAutomodMessage(context, action, rest) {
  if (action === 'view') {
    return handleSettingsActionSafely({ guildId: context.guild.id, group: 'automod', subcommand: 'view', values: {} });
  }

  if (action === 'on' || action === 'off') {
    return handleSettingsActionSafely({
      guildId: context.guild.id,
      group: 'automod',
      subcommand: 'toggle',
      values: { enabled: action === 'on' }
    });
  }

  if (action === 'threshold') {
    return handleSettingsActionSafely({
      guildId: context.guild.id,
      group: 'automod',
      subcommand: 'threshold',
      values: { rule: rest[0], value: parsePositiveInteger(rest[1]) }
    });
  }

  if (action === 'punishment') {
    return handleSettingsActionSafely({
      guildId: context.guild.id,
      group: 'automod',
      subcommand: 'punishment',
      values: { rule: rest[0], action: rest[1], duration: rest[2] }
    });
  }

  if (action === 'badword') {
    return handleSettingsActionSafely({
      guildId: context.guild.id,
      group: 'automod',
      subcommand: 'badword',
      values: { action: rest[0], word: rest[1] }
    });
  }

  return {
    embed: buildErrorEmbed(
      'Automod action unavailable',
      'Use `view`, `on`, `off`, `threshold`, `punishment`, or `badword`.'
    )
  };
}

export async function handleTrustedRoleMessage(context) {
  const [action] = context.args;
  const role = resolveRoleFromMessage(context.message, context.args.slice(1));

  if (action === 'list') {
    return handleSettingsActionSafely({
      guildId: context.guild.id,
      group: 'trusted-role',
      subcommand: 'list',
      values: {}
    });
  }

  if (!role) {
    return { embed: buildErrorEmbed('Role required', 'Mention a role or provide a role name.') };
  }

  return handleSettingsActionSafely({
    guildId: context.guild.id,
    group: 'trusted-role',
    subcommand: action,
    values: { roleId: role.id }
  });
}

async function handleSettingsActionSafely(input) {
  try {
    return await handleSettingsAction(input);
  } catch (error) {
    return {
      embed: buildErrorEmbed('Settings update failed', error.message ?? 'That settings update could not be applied.')
    };
  }
}
