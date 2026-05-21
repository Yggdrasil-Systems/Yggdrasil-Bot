import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildErrorEmbed, buildModerationResultEmbed } from '../../utils/embeds.js';
import { getInteractionModerator, getInteractionTarget, getMessageTarget, getReasonFromArgs } from '../../utils/moderationInputs.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'ban';
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a user and record a moderation case.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
  .addUserOption((option) => option.setName('user').setDescription('The user to ban.').setRequired(true))
  .addStringOption((option) => option.setName('reason').setDescription('Why this ban is being issued.').setRequired(true));

export async function execute(interaction) {
  const { targetUser, targetMember } = await getInteractionTarget(interaction);
  const moderatorMember = await getInteractionModerator(interaction);
  const result = await moderationService.ban({
    guild: interaction.guild,
    moderatorMember,
    targetMember,
    targetUser,
    reason: interaction.options.getString('reason', true),
    settings: interaction.guildSettings
  });

  await replyToInteraction(interaction, {
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Member banned', result.moderationCase)
        : buildErrorEmbed('Ban failed', result.reason)
    ]
  }, { ephemeral: !result.ok });
}

export async function executeMessage(context) {
  const target = await getMessageTarget(context);

  if (!target) {
    return;
  }

  const result = await moderationService.ban({
    guild: context.guild,
    moderatorMember: context.member,
    targetMember: target.targetMember,
    targetUser: target.targetUser,
    reason: getReasonFromArgs(context.args),
    settings: context.settings
  });

  await context.respond({
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Member banned', result.moderationCase)
        : buildErrorEmbed('Ban failed', result.reason)
    ]
  });
}
