import { SlashCommandBuilder } from 'discord.js';

import { getMemberCountSummary } from '../../services/utilityService.js';
import { buildMemberCountEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'membercount';
export const aliases = ['members'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('membercount')
  .setDescription('Show the current server member count.');

export async function execute(interaction) {
  await replyToInteraction(interaction, {
    embeds: [buildMemberCountEmbed(getMemberCountSummary({ guild: interaction.guild }))]
  });
}

export async function executeMessage(context) {
  await context.respond({
    embeds: [buildMemberCountEmbed(getMemberCountSummary({ guild: context.guild }))]
  });
}
