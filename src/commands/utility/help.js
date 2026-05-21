import { SlashCommandBuilder } from 'discord.js';

import { buildHelpComponents, buildHelpEmbed } from '../../services/helpService.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'help';
export const aliases = ['commands'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Learn how to use World Tree.');

export async function execute(interaction) {
  await replyToInteraction(interaction, {
    embeds: [buildHelpEmbed()],
    components: buildHelpComponents({ requesterId: interaction.user.id })
  }, { ephemeral: true });
}

export async function executeMessage(context) {
  await context.respond({
    embeds: [buildHelpEmbed()],
    components: buildHelpComponents({ requesterId: context.user.id })
  });
}
