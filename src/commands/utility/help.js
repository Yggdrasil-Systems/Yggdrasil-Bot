import { SlashCommandBuilder } from 'discord.js';

import { buildHelpEmbed } from '../../services/helpService.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'help';
export const aliases = ['commands'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Learn how to use World Tree.');

export async function execute(interaction) {
  await replyToInteraction(interaction, {
    embeds: [buildHelpEmbed()]
  }, { ephemeral: true });
}

export async function executeMessage(context) {
  await context.respond({
    embeds: [buildHelpEmbed()]
  });
}
