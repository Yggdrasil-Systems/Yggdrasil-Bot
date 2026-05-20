import { SlashCommandBuilder } from 'discord.js';

import { getBannerSummary } from '../../services/utilityService.js';
import { buildBannerEmbed } from '../../utils/embeds.js';
import { resolveUserFromMessage } from '../../utils/discordResolvers.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'banner';

export const data = new SlashCommandBuilder()
  .setName('banner')
  .setDescription('View a user profile banner.')
  .addUserOption((option) => option
    .setName('user')
    .setDescription('The user to inspect.')
    .setRequired(false));

async function fetchFreshUser(client, user) {
  return client.users.fetch(user.id, { force: true }).catch(() => user);
}

export async function execute(interaction) {
  const user = interaction.options.getUser('user') ?? interaction.user;
  const freshUser = await fetchFreshUser(interaction.client, user);
  const summary = getBannerSummary({ user: freshUser });

  await replyToInteraction(interaction, {
    embeds: [buildBannerEmbed(summary)]
  });
}

export async function executeMessage(context) {
  const user = await resolveUserFromMessage(context.message, context.args);
  const freshUser = await fetchFreshUser(context.client, user);
  const summary = getBannerSummary({ user: freshUser });

  await context.respond({
    embeds: [buildBannerEmbed(summary)]
  });
}
