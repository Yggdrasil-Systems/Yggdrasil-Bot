import { SlashCommandBuilder } from 'discord.js';

import { getStatsSummary } from '../../services/utilityService.js';
import { buildStatsEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'stats';
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder().setName('stats').setDescription('Show World Tree runtime stats.');

export async function execute(interaction) {
  await replyToInteraction(
    interaction,
    {
      embeds: [buildStatsEmbed(getStatsSummary({ client: interaction.client }))]
    },
    { ephemeral: true }
  );
}

export async function executeMessage(context) {
  await context.respond({
    embeds: [buildStatsEmbed(getStatsSummary({ client: context.client }))]
  });
}
