import { SlashCommandBuilder } from 'discord.js';

import { getPingSummary } from '../../services/utilityService.js';
import { buildSuccessEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether World Tree is responsive.');

export async function execute(interaction) {
  const ping = getPingSummary(interaction);

  await interaction.reply({
    embeds: [buildSuccessEmbed('Tree Status', ping.description)]
  });
}
