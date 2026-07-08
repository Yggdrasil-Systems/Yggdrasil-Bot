import { SlashCommandBuilder } from 'discord.js';

import { getUserInfoSummary } from '../../services/utilityService.js';
import { buildUserInfoEmbed, buildErrorEmbed } from '../../utils/embeds.js';
import { resolveMember, resolveUserFromMessage } from '../../utils/discordResolvers.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'userinfo';
export const aliases = ['user'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('View account and server membership details.')
  .addUserOption((option) => option.setName('user').setDescription('The user to inspect.').setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser('user') ?? interaction.user;
  const member = await resolveMember(interaction.guild, user.id);
  const summary = getUserInfoSummary({ user, member, guildId: interaction.guild.id });

  await replyToInteraction(interaction, {
    embeds: [buildUserInfoEmbed(summary)]
  });
}

export async function executeMessage(context) {
  const user = await resolveUserFromMessage(context.message, context.args);

  if (!user) {
    return context.respond({
      embeds: [buildErrorEmbed('User Not Found', 'Could not resolve that user. Please verify the ID or mention.')]
    });
  }

  const member = await resolveMember(context.guild, user.id);
  const summary = getUserInfoSummary({ user, member, guildId: context.guild.id });

  await context.respond({
    embeds: [buildUserInfoEmbed(summary)]
  });
}
