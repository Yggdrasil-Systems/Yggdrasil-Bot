import { ChannelType, PermissionsBitField, SlashCommandBuilder } from 'discord.js';

import { settingsService } from '../../services/settingsService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'setmodlog';
export const aliases = ['modlog'];
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('setmodlog')
  .setDescription('Set the channel used for moderation logs.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addChannelOption((option) => option
    .setName('channel')
    .setDescription('The moderation log channel.')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true));

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel', true);
  await settingsService.setModLogChannel(interaction.guild.id, channel.id);

  await replyToInteraction(interaction, {
    embeds: [buildSuccessEmbed('Mod log configured', `Moderation logs will be sent to ${channel}.`)]
  }, { ephemeral: true });
}

export async function executeMessage(context) {
  const channel = context.message.mentions.channels.first();

  if (!channel) {
    await context.respond({
      embeds: [buildErrorEmbed('Channel required', 'Mention the channel to use for moderation logs.')]
    });
    return;
  }

  await settingsService.setModLogChannel(context.guild.id, channel.id);

  await context.respond({
    embeds: [buildSuccessEmbed('Mod log configured', `Moderation logs will be sent to ${channel}.`)]
  });
}
