import { SlashCommandBuilder } from 'discord.js';

import { getRoleInfoSummary } from '../../services/utilityService.js';
import { buildErrorEmbed, buildRoleInfoEmbed } from '../../utils/embeds.js';
import { resolveRoleFromMessage } from '../../utils/discordResolvers.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'roleinfo';
export const aliases = ['role'];

export const data = new SlashCommandBuilder()
  .setName('roleinfo')
  .setDescription('View role details.')
  .addRoleOption((option) => option.setName('role').setDescription('The role to inspect.').setRequired(true));

export async function execute(interaction) {
  const role = interaction.options.getRole('role', true);
  const summary = getRoleInfoSummary({ role });

  await replyToInteraction(interaction, {
    embeds: [buildRoleInfoEmbed(summary)]
  });
}

export async function executeMessage(context) {
  const role = resolveRoleFromMessage(context.message, context.args);

  if (!role) {
    await context.respond({
      embeds: [buildErrorEmbed('Role required', 'Mention a role, provide a role ID, or type the exact role name.')]
    });
    return;
  }

  const summary = getRoleInfoSummary({ role });

  await context.respond({
    embeds: [buildRoleInfoEmbed(summary)]
  });
}
