import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildErrorEmbed, buildModerationResultEmbed } from '../../utils/embeds.js';
import { getInteractionModerator, getInteractionTarget, getMessageTarget, getReasonFromArgs } from '../../utils/moderationInputs.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'timeout';
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Timeout a user and record a moderation case.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
  .addUserOption((option) => option.setName('user').setDescription('The user to timeout.').setRequired(true))
  .addStringOption((option) => option.setName('duration').setDescription('Duration such as 10m, 2h, or 1d.').setRequired(true))
  .addStringOption((option) => option.setName('reason').setDescription('Why this timeout is being issued.').setRequired(true));

export async function execute(interaction) {
  const { targetMember } = await getInteractionTarget(interaction);
  const moderatorMember = await getInteractionModerator(interaction);
  const result = await moderationService.timeout({
    guild: interaction.guild,
    moderatorMember,
    targetMember,
    duration: interaction.options.getString('duration', true),
    reason: interaction.options.getString('reason', true)
  });

  await replyToInteraction(interaction, {
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Timeout applied', result.moderationCase)
        : buildErrorEmbed('Timeout failed', result.reason)
    ]
  }, { ephemeral: !result.ok });
}

export async function executeMessage(context) {
  const target = await getMessageTarget(context);

  if (!target) {
    return;
  }

  const result = await moderationService.timeout({
    guild: context.guild,
    moderatorMember: context.member,
    targetMember: target.targetMember,
    duration: context.args[1],
    reason: getReasonFromArgs(context.args, 2)
  });

  await context.respond({
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Timeout applied', result.moderationCase)
        : buildErrorEmbed('Timeout failed', result.reason)
    ]
  });
}
