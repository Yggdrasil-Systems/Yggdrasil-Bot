import { SlashCommandBuilder } from 'discord.js';

import { moderationService } from '../../services/moderationService.js';
import { buildWarningsEmbed } from '../../utils/embeds.js';
import { resolveUserFromMessage } from '../../utils/discordResolvers.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'warnings';
export const aliases = ['warns'];
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('View warning history for a user.')
  .addUserOption((option) => option.setName('user').setDescription('The user to inspect.').setRequired(true));

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('user', true);
  const result = await moderationService.warnings({
    guildId: interaction.guild.id,
    targetUserId: targetUser.id
  });

  await replyToInteraction(interaction, {
    embeds: [buildWarningsEmbed({ targetUser, warnings: result.warnings })]
  }, { ephemeral: true });
}

export async function executeMessage(context) {
  const targetUser = await resolveUserFromMessage(context.message, context.args, { optional: false });

  if (!targetUser) {
    return;
  }

  const result = await moderationService.warnings({
    guildId: context.guild.id,
    targetUserId: targetUser.id
  });

  await context.respond({
    embeds: [buildWarningsEmbed({ targetUser, warnings: result.warnings })]
  });
}
