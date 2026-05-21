import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { getInteractionModerator, getMessageAmount } from '../../utils/moderationInputs.js';
import { replyToInteraction } from '../../utils/responses.js';
import { validateNumericLimit } from '../../utils/validators.js';

export const name = 'purge';
export const adminOnly = true;
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Delete recent messages and record a moderation case.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
  .addIntegerOption((option) => option.setName('amount').setDescription('Number of messages to delete.').setRequired(true).setMinValue(1).setMaxValue(100))
  .addStringOption((option) => option.setName('reason').setDescription('Why these messages are being removed.').setRequired(false));

export async function execute(interaction) {
  const moderatorMember = await getInteractionModerator(interaction);
  const amountValidation = validateNumericLimit(interaction.options.getInteger('amount', true), 1, 100, 'Amount');

  if (!amountValidation.valid) {
    await replyToInteraction(interaction, {
      embeds: [buildErrorEmbed('Purge failed', amountValidation.reason)]
    }, { ephemeral: true });
    return;
  }

  const result = await moderationService.purge({
    message: {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: moderatorMember
    },
    moderatorMember,
    amount: amountValidation.value,
    reason: interaction.options.getString('reason') ?? 'Message purge',
    settings: interaction.guildSettings
  });

  await replyToInteraction(interaction, {
    embeds: [
      result.ok
        ? buildSuccessEmbed('Messages purged', `Removed ${result.moderationCase.deletedMessageCount} message(s). Case #${result.moderationCase.caseId}.`)
        : buildErrorEmbed('Purge failed', result.reason)
    ]
  }, { ephemeral: !result.ok });
}

export async function executeMessage(context) {
  const amountValidation = validateNumericLimit(getMessageAmount(context), 1, 100, 'Amount');

  if (!amountValidation.valid) {
    await context.respond({
      embeds: [buildErrorEmbed('Purge failed', amountValidation.reason)]
    });
    return;
  }

  const result = await moderationService.purge({
    message: context.message,
    moderatorMember: context.member,
    amount: amountValidation.value,
    settings: context.settings
  });

  await context.respond({
    embeds: [
      result.ok
        ? buildSuccessEmbed('Messages purged', `Removed ${result.moderationCase.deletedMessageCount} message(s). Case #${result.moderationCase.caseId}.`)
        : buildErrorEmbed('Purge failed', result.reason)
    ]
  });
}
