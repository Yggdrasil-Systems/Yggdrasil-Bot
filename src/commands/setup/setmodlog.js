import { SlashCommandBuilder, PermissionsBitField, ChannelType } from 'discord.js';
import { handleSet } from '../../controllers/modlogController.js';
import { replyToInteraction } from '../../utils/responses.js';
import { buildErrorEmbed } from '../../utils/embeds.js';

export const name = 'setmodlog';
// NOTE: `aliases = ['modlog']` has been REMOVED to prevent duplicate command name collisions
// now that the `modlog` namespace handles all modlog-related commands.
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('setmodlog')
  .setDescription('Set the channel used for moderation logs. (Deprecated)')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The moderation log channel.')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel', true);

  // Show deprecation warning via a normal reply
  await interaction.reply({
    content: '⚠ **Deprecation Warning:** `/setmodlog` is deprecated. Please use `/modlog set` instead.',
    ephemeral: true
  });

  // Delegate to the shared controller
  const payload = await handleSet(interaction.guildId, channel.id);

  // Since we already replied, `replyToInteraction` will automatically use `followUp`
  await replyToInteraction(interaction, payload, { ephemeral: true });
}

export async function executeMessage(context) {
  const channel = context.message.mentions.channels.first();

  if (!channel) {
    await context.respond({
      content: '⚠ **Deprecation Warning:** `tree setmodlog` is deprecated. Please use `tree modlog set` instead.',
      embeds: [buildErrorEmbed('Channel required', 'Mention the channel to use for moderation logs.')]
    });
    return;
  }

  // Delegate to the shared controller
  const payload = await handleSet(context.guild.id, channel.id);

  await context.respond({
    content: '⚠ **Deprecation Warning:** `tree setmodlog` is deprecated. Please use `tree modlog set` instead.',
    embeds: payload.embeds
  });
}
