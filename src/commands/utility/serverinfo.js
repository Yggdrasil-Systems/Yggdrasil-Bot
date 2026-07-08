import { SlashCommandBuilder } from 'discord.js';

import { getServerInfoSummary } from '../../services/utilityService.js';
import { buildServerInfoEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'serverinfo';
export const aliases = ['server'];

export const data = new SlashCommandBuilder().setName('serverinfo').setDescription('View server details.');

export async function execute(interaction) {
  const summary = getServerInfoSummary({ guild: interaction.guild });

  await replyToInteraction(interaction, {
    embeds: [buildServerInfoEmbed(summary)]
  });
}

export async function executeMessage(context) {
  const summary = getServerInfoSummary({ guild: context.guild });

  await context.respond({
    embeds: [buildServerInfoEmbed(summary)]
  });
}
