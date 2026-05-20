import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildErrorEmbed, buildModerationResultEmbed } from '../../utils/embeds.js';
import { getInteractionModerator, getInteractionTarget, getMessageTarget, getReasonFromArgs } from '../../utils/moderationInputs.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'untimeout';
export const aliases = ['removetimeout'];
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('untimeout')
  .setDescription('Remove a user timeout and record a moderation case.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
  .addUserOption((option) => option.setName('user').setDescription('The user to restore.').setRequired(true))
  .addStringOption((option) => option.setName('reason').setDescription('Why this timeout is being removed.').setRequired(false));

export async function execute(interaction) {
  const { targetMember } = await getInteractionTarget(interaction);
  const moderatorMember = await getInteractionModerator(interaction);
  const result = await moderationService.untimeout({
    guild: interaction.guild,
    moderatorMember,
    targetMember,
    reason: interaction.options.getString('reason') ?? 'Timeout removed'
  });

  await replyToInteraction(interaction, {
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Timeout removed', result.moderationCase)
        : buildErrorEmbed('Untimeout failed', result.reason)
    ]
  }, { ephemeral: !result.ok });
}

export async function executeMessage(context) {
  const target = await getMessageTarget(context);

  if (!target) {
    return;
  }

  const result = await moderationService.untimeout({
    guild: context.guild,
    moderatorMember: context.member,
    targetMember: target.targetMember,
    reason: getReasonFromArgs(context.args, 1, 'Timeout removed')
  });

  await context.respond({
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Timeout removed', result.moderationCase)
        : buildErrorEmbed('Untimeout failed', result.reason)
    ]
  });
}
