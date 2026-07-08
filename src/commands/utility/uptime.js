import { SlashCommandBuilder } from 'discord.js';

import { buildBotInfoEmbed } from '../../utils/embeds.js';
import { getBotInfoSummary } from '../../services/utilityService.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'uptime';
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder().setName('uptime').setDescription('Show World Tree uptime.');

export async function execute(interaction) {
  await replyToInteraction(
    interaction,
    {
      embeds: [buildBotInfoEmbed(getBotInfoSummary({ client: interaction.client }))]
    },
    { ephemeral: true }
  );
}

export async function executeMessage(context) {
  await context.respond({
    embeds: [buildBotInfoEmbed(getBotInfoSummary({ client: context.client }))]
  });
}
