import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildErrorEmbed, buildModerationResultEmbed } from '../../utils/embeds.js';
import { getInteractionModerator, getInteractionTarget, getMessageTarget, getReasonFromArgs } from '../../utils/moderationInputs.js';
import { replyToInteraction } from '../../utils/responses.js';
import { validateTimeoutDuration } from '../../utils/validators.js';

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
  const duration = interaction.options.getString('duration', true);
  const durationValidation = validateTimeoutDuration(duration);

  if (!durationValidation.valid) {
    await replyToInteraction(interaction, {
      embeds: [buildErrorEmbed('Timeout failed', durationValidation.reason)]
    }, { ephemeral: true });
    return;
  }

  const { targetMember } = await getInteractionTarget(interaction);
  const moderatorMember = await getInteractionModerator(interaction);
  const result = await moderationService.timeout({
    guild: interaction.guild,
    moderatorMember,
    targetMember,
    duration,
    reason: interaction.options.getString('reason', true),
    settings: interaction.guildSettings
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
  const durationValidation = validateTimeoutDuration(context.args[1]);

  if (!durationValidation.valid) {
    await context.respond({
      embeds: [buildErrorEmbed('Timeout failed', durationValidation.reason)]
    });
    return;
  }

  const target = await getMessageTarget(context);

  if (!target) {
    return;
  }

  const result = await moderationService.timeout({
    guild: context.guild,
    moderatorMember: context.member,
    targetMember: target.targetMember,
    duration: context.args[1],
    reason: getReasonFromArgs(context.args, 2),
    settings: context.settings
  });

  await context.respond({
    embeds: [
      result.ok
        ? buildModerationResultEmbed('Timeout applied', result.moderationCase)
        : buildErrorEmbed('Timeout failed', result.reason)
    ]
  });
}
