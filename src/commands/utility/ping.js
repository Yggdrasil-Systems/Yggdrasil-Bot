import { SlashCommandBuilder } from 'discord.js';

import { getPingSummary } from '../../services/utilityService.js';
import { buildPingEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'ping';
export const aliases = [];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether World Tree is responsive.');

export async function execute(interaction) {
  const ping = getPingSummary(interaction);

  await replyToInteraction(interaction, {
    embeds: [buildPingEmbed(ping)]
  });
}

export async function executeMessage(context) {
  const ping = getPingSummary(context.message);

  await context.respond({
    embeds: [buildPingEmbed(ping)]
  });
}
