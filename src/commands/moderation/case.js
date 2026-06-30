import { PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildCaseEmbed, buildCaseListEmbed, buildCaseStatsEmbed, buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { parsePositiveInteger } from '../../utils/discordResolvers.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'case';
export const aliases = ['cases'];
export const adminOnly = true;
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('case')
  .setDescription('View and manage moderation cases.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
  .addSubcommand((subcommand) => subcommand
    .setName('view')
    .setDescription('View a moderation case.')
    .addIntegerOption((option) => option.setName('id').setDescription('Case ID.').setRequired(true).setMinValue(1)))
  .addSubcommand((subcommand) => subcommand
    .setName('list')
    .setDescription('List recent moderation cases.')
    .addUserOption((option) => option.setName('user').setDescription('Filter by user.')))
  .addSubcommand((subcommand) => subcommand
    .setName('resolve')
    .setDescription('Mark a moderation case as resolved.')
    .addIntegerOption((option) => option.setName('id').setDescription('Case ID.').setRequired(true).setMinValue(1))
    .addStringOption((option) => option.setName('reason').setDescription('Resolution reason.')))
  .addSubcommand((subcommand) => subcommand
    .setName('delete')
    .setDescription('Soft-delete a moderation case.')
    .addIntegerOption((option) => option.setName('id').setDescription('Case ID.').setRequired(true).setMinValue(1))
    .addStringOption((option) => option.setName('reason').setDescription('Deletion reason.')))
  .addSubcommand((subcommand) => subcommand
    .setName('stats')
    .setDescription('View moderation case stats.'));

async function handleCaseAction({ guildId, userId, subcommand, values }) {
  if (subcommand === 'view') {
    const result = await moderationService.getCase({ guildId, caseId: values.caseId });
    return { embed: result.ok ? buildCaseEmbed(result.moderationCase) : buildErrorEmbed('Case not found', result.reason) };
  }

  if (subcommand === 'list') {
    const result = await moderationService.listCases({ guildId, targetUserId: values.targetUserId, limit: 10 });
    return { embed: buildCaseListEmbed(result.cases) };
  }

  if (subcommand === 'resolve') {
    const result = await moderationService.resolveCase({
      guildId,
      caseId: values.caseId,
      resolvedBy: userId,
      resolutionReason: values.reason
    });
    return {
      embed: result.ok
        ? buildSuccessEmbed('Case resolved', `Case #${result.moderationCase.caseId} was marked resolved.`)
        : buildErrorEmbed('Resolve failed', result.reason)
    };
  }

  if (subcommand === 'delete') {
    const result = await moderationService.deleteCase({
      guildId,
      caseId: values.caseId,
      resolvedBy: userId,
      resolutionReason: values.reason
    });
    return {
      embed: result.ok
        ? buildSuccessEmbed('Case deleted', `Case #${result.moderationCase.caseId} was soft-deleted.`)
        : buildErrorEmbed('Delete failed', result.reason)
    };
  }

  const result = await moderationService.getCaseStats({ guildId });
  return { embed: buildCaseStatsEmbed(result.stats) };
}

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const result = await handleCaseAction({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    subcommand,
    values: {
      caseId: interaction.options.getInteger('id'),
      targetUserId: interaction.options.getUser('user')?.id,
      reason: interaction.options.getString('reason') ?? undefined
    }
  });

  await replyToInteraction(interaction, { embeds: [result.embed] }, { ephemeral: true });
}

export async function executeMessage(context) {
  const [subcommand = 'list', idOrUser, ...reasonParts] = context.args;
  const targetUserId = subcommand === 'list' && idOrUser ? idOrUser.match(/\d{17,20}/)?.[0] : undefined;

  const result = await handleCaseAction({
    guildId: context.guild.id,
    userId: context.user.id,
    subcommand,
    values: {
      caseId: subcommand !== 'list' ? parsePositiveInteger(idOrUser) : undefined,
      targetUserId,
      reason: reasonParts.join(' ').trim() || undefined
    }
  });

  await context.respond({ embeds: [result.embed] });
}
