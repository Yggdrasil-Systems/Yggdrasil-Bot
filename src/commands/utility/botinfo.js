import { SlashCommandBuilder } from 'discord.js';

import { getBotInfoSummary } from '../../services/utilityService.js';
import { buildBotInfoEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'botinfo';
export const aliases = ['bot'];

export const data = new SlashCommandBuilder()
  .setName('botinfo')
  .setDescription('View World Tree runtime details.');

export async function execute(interaction) {
  const summary = getBotInfoSummary({ client: interaction.client });

  await replyToInteraction(interaction, {
    embeds: [buildBotInfoEmbed(summary)]
  });
}

export async function executeMessage(context) {
  const summary = getBotInfoSummary({ client: context.client });

  await context.respond({
    embeds: [buildBotInfoEmbed(summary)]
  });
}
