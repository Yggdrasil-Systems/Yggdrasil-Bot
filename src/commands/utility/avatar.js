import { SlashCommandBuilder } from 'discord.js';

import { getAvatarSummary } from '../../services/utilityService.js';
import { buildAvatarEmbed, buildErrorEmbed } from '../../utils/embeds.js';
import { resolveUserFromMessage } from '../../utils/discordResolvers.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'avatar';
export const aliases = ['av'];

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('View a user avatar.')
  .addUserOption((option) => option.setName('user').setDescription('The user to inspect.').setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser('user') ?? interaction.user;
  const summary = getAvatarSummary({ user });

  await replyToInteraction(interaction, {
    embeds: [buildAvatarEmbed(summary)]
  });
}

export async function executeMessage(context) {
  const user = await resolveUserFromMessage(context.message, context.args);

  if (!user) {
    return context.respond({
      embeds: [buildErrorEmbed('User Not Found', 'Could not resolve that user. Please verify the ID or mention.')]
    });
  }

  const summary = getAvatarSummary({ user });

  await context.respond({
    embeds: [buildAvatarEmbed(summary)]
  });
}
