import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

import { settingsService } from '../../services/settingsService.js';
import { buildSuccessEmbed, buildErrorEmbed, buildNeutralEmbed } from '../../utils/embeds.js';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_DESCRIPTIONS } from '../../utils/constants.js';
import { replyToInteraction } from '../../utils/responses.js';
import { executeMessage as executeSettingsMessage } from './settings.js';

export const name = 'activityrole';
export const aliases = ['activity-role', 'ar'];
export const adminOnly = true;
export const allowNoPrefix = true;

const activityTypeChoices = Object.keys(ACTIVITY_TYPES).map((type) => ({
  name: ACTIVITY_TYPE_LABELS[type],
  value: type
}));

function buildActivityRoleEmbed(settings) {
  const roles = Object.entries(settings.activityRoles ?? {})
    .map(([type, config]) => {
      const label = ACTIVITY_TYPE_LABELS[type];
      const status = config.enabled ? `✅ <@&${config.roleId}>` : '❌ Disabled';
      return `${label}: ${status}`;
    })
    .join('\n');

  return buildNeutralEmbed(
    '⚡ Activity Roles',
    roles || 'No activity roles configured.'
  );
}

export const data = new SlashCommandBuilder()
  .setName('activityrole')
  .setDescription('Configure automatic roles based on user activity.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('set')
      .setDescription('Enable an activity role for this server.')
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('The activity type to configure.')
          .setRequired(true)
          .addChoices(...activityTypeChoices))
      .addRoleOption((option) =>
        option
          .setName('role')
          .setDescription('The role to assign automatically.')
          .setRequired(true)))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('remove')
      .setDescription('Disable an activity role for this server.')
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('The activity type to disable.')
          .setRequired(true)
          .addChoices(...activityTypeChoices)))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('list')
      .setDescription('Show all configured activity roles.'));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (!guildId) {
    await replyToInteraction(
      interaction,
      { embeds: [buildErrorEmbed('Server Only', 'Activity roles can only be configured in a server.')] },
      { ephemeral: true }
    );
    return;
  }

  try {
    if (subcommand === 'set') {
      const activityType = interaction.options.getString('type', true);
      const role = interaction.options.getRole('role', true);

      const botMember = interaction.guild?.members?.me;
      if (!botMember?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
        await replyToInteraction(
          interaction,
          { embeds: [buildErrorEmbed('Permission Denied', 'World Tree needs the **Manage Roles** permission to assign activity roles.')] },
          { ephemeral: true }
        );
        return;
      }

      const botHighestRole = botMember.roles?.highest;
      if (botHighestRole && role.position >= botHighestRole.position) {
        await replyToInteraction(
          interaction,
          { embeds: [buildErrorEmbed('Role Hierarchy', 'World Tree cannot manage a role that is equal to or higher than its highest role.')] },
          { ephemeral: true }
        );
        return;
      }

      await settingsService.setActivityRole(guildId, activityType, { enabled: true, roleId: role.id });

      await replyToInteraction(
        interaction,
        {
          embeds: [buildSuccessEmbed(
            'Activity Role Configured',
            `${ACTIVITY_TYPE_LABELS[activityType]} is now **enabled**.\nMembers will receive the <@&${role.id}> role when they ${ACTIVITY_TYPE_DESCRIPTIONS[activityType].toLowerCase()}.`
          )]
        },
        { ephemeral: true }
      );
      return;
    }

    if (subcommand === 'remove') {
      const activityType = interaction.options.getString('type', true);
      await settingsService.removeActivityRole(guildId, activityType);

      await replyToInteraction(
        interaction,
        {
          embeds: [buildSuccessEmbed(
            'Activity Role Removed',
            `${ACTIVITY_TYPE_LABELS[activityType]} is now **disabled**.\nMembers will no longer receive or lose roles based on this activity.`
          )]
        },
        { ephemeral: true }
      );
      return;
    }

    if (subcommand === 'list') {
      const settings = await settingsService.getEffectiveSettings(guildId);

      await replyToInteraction(
        interaction,
        { embeds: [buildActivityRoleEmbed(settings)] },
        { ephemeral: true }
      );
      return;
    }
  } catch (error) {
    await replyToInteraction(
      interaction,
      { embeds: [buildErrorEmbed('Error', `Failed to configure activity role.\n\`\`\`${error.message.slice(0, 200)}\`\`\``)] },
      { ephemeral: true }
    );
  }
}

export async function executeMessage(context) {
  await executeSettingsMessage({
    ...context,
    args: ['activityrole', ...context.args]
  });
}
