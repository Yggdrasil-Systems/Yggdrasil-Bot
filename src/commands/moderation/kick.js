import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildErrorEmbed, buildModerationResultEmbed } from '../../utils/embeds.js';
import {
  getInteractionModerator,
  getInteractionTarget,
  getMessageTarget,
  getReasonFromArgs
} from '../../utils/moderationInputs.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'kick';
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a user and record a moderation case.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
  .addUserOption((option) => option.setName('user').setDescription('The user to kick.').setRequired(true))
  .addStringOption((option) =>
    option.setName('reason').setDescription('Why this kick is being issued.').setRequired(true)
  );

export async function execute(interaction) {
  const { targetMember } = await getInteractionTarget(interaction);
  const moderatorMember = await getInteractionModerator(interaction);
  const result = await moderationService.kick({
    guild: interaction.guild,
    moderatorMember,
    targetMember,
    reason: interaction.options.getString('reason', true)
  });

  await replyToInteraction(
    interaction,
    {
      embeds: [
        result.ok
          ? buildModerationResultEmbed('Member kicked', result.moderationCase)
          : buildErrorEmbed('Kick failed', result.reason)
      ]
    },
    { ephemeral: !result.ok }
  );
}

export async function executeMessage(context) {
  const target = await getMessageTarget(context);

  if (!target) {
    return;
  }

  const result = await moderationService.kick({
    guild: context.guild,
    moderatorMember: context.member,
    targetMember: target.targetMember,
    reason: getReasonFromArgs(context.args)
  });

  await context.respond({
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Member kicked', result.moderationCase)
        : buildErrorEmbed('Kick failed', result.reason)
    ]
  });
}
