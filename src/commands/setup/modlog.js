import { SlashCommandBuilder, PermissionsBitField, ChannelType } from 'discord.js';
import { handleView, handleSet, handleDisable } from '../../controllers/modlogController.js';
import { replyToInteraction } from '../../utils/responses.js';
import { buildErrorEmbed } from '../../utils/embeds.js';

export const name = 'modlog';
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('modlog')
  .setDescription('Manage the moderation log channel.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addSubcommand((subcommand) => subcommand.setName('view').setDescription('View the current moderation log channel.'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('set')
      .setDescription('Set the moderation log channel.')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('The moderation log channel.')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Disable moderation logging.'));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (subcommand === 'view') {
    const payload = await handleView(guildId);
    await replyToInteraction(interaction, payload, { ephemeral: true });
    return;
  }

  if (subcommand === 'set') {
    const channelId = interaction.options.getChannel('channel', true).id;
    const payload = await handleSet(guildId, channelId);
    await replyToInteraction(interaction, payload, { ephemeral: true });
    return;
  }

  if (subcommand === 'disable') {
    const payload = await handleDisable(guildId);
    await replyToInteraction(interaction, payload, { ephemeral: true });
    return;
  }
}

export async function executeMessage(context) {
  const guildId = context.guild.id;
  const subcommand = context.args[0]?.toLowerCase();

  // Backward compatibility: If the first argument is a channel mention, treat it as a deprecated 'set'
  if (context.message.mentions.channels.size > 0 && (!subcommand || subcommand.startsWith('<#'))) {
    const channelId = context.message.mentions.channels.first().id;
    const payload = await handleSet(guildId, channelId);
    await context.respond({
      content:
        '⚠ **Deprecation Warning:** Using `tree modlog #channel` is deprecated. Please use `tree modlog set #channel` or `/modlog set` instead.',
      embeds: payload.embeds
    });
    return;
  }

  if (subcommand === 'set') {
    const channel = context.message.mentions.channels.first();
    if (!channel) {
      await context.respond({
        embeds: [
          buildErrorEmbed(
            'Channel Required',
            'Please mention the channel to use for moderation logs (e.g., `tree modlog set #logs`).'
          )
        ]
      });
      return;
    }
    const payload = await handleSet(guildId, channel.id);
    await context.respond(payload);
    return;
  }

  if (subcommand === 'disable') {
    const payload = await handleDisable(guildId);
    await context.respond(payload);
    return;
  }

  // Default to view
  if (!subcommand || subcommand === 'view') {
    const payload = await handleView(guildId);
    await context.respond(payload);
    return;
  }

  await context.respond({
    embeds: [buildErrorEmbed('Invalid Subcommand', 'Please use `view`, `set`, or `disable`.')]
  });
}
