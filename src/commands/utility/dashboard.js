import { SlashCommandBuilder } from 'discord.js';

import { buildDashboardEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'dashboard';
export const aliases = ['dash'];

export const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('View dashboard foundation status.');

function getDashboardUrl(client) {
  return client.runtimeConfig?.dashboardUrl ?? null;
}

export async function execute(interaction) {
  await replyToInteraction(interaction, {
    embeds: [buildDashboardEmbed({ dashboardUrl: getDashboardUrl(interaction.client) })]
  }, { ephemeral: true });
}

export async function executeMessage(context) {
  await context.respond({
    embeds: [buildDashboardEmbed({ dashboardUrl: getDashboardUrl(context.client) })]
  });
}
