import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { getInteractionModerator, getMessageAmount } from '../../utils/moderationInputs.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'purge';
export const modOnly = true;
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Delete recent messages and record a moderation case.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('Number of messages to delete.')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addStringOption((option) =>
    option.setName('reason').setDescription('Why these messages are being removed.').setRequired(false)
  );

export async function execute(interaction) {
  const moderatorMember = await getInteractionModerator(interaction);
  const result = await moderationService.purge({
    message: {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: moderatorMember
    },
    moderatorMember,
    amount: interaction.options.getInteger('amount', true),
    reason: interaction.options.getString('reason') ?? 'Message purge'
  });

  await replyToInteraction(
    interaction,
    {
      embeds: [
        result.ok
          ? buildSuccessEmbed(
              'Messages purged',
              `Removed ${result.moderationCase.deletedMessageCount} message(s). Case #${result.moderationCase.caseId}.`
            )
          : buildErrorEmbed('Purge failed', result.reason)
      ]
    },
    { ephemeral: !result.ok }
  );
}

export async function executeMessage(context) {
  const result = await moderationService.purge({
    message: context.message,
    moderatorMember: context.member,
    amount: getMessageAmount(context)
  });

  await context.respond({
    embeds: [
      result.ok
        ? buildSuccessEmbed(
            'Messages purged',
            `Removed ${result.moderationCase.deletedMessageCount} message(s). Case #${result.moderationCase.caseId}.`
          )
        : buildErrorEmbed('Purge failed', result.reason)
    ]
  });
}
