import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

import { buildSuccessEmbed, buildBaseEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'setup-music';
export const aliases = [];
export const allowNoPrefix = false;
export const adminOnly = true;

export const data = new SlashCommandBuilder()
  .setName('setup-music')
  .setDescription('Create a dedicated music request channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const guild = interaction.guild;
  const settingsService = interaction.client.appContext?.settingsService ?? interaction.client.settingsService ?? null;
  
  // Create a new text channel
  const channel = await guild.channels.create({
    name: 'music-requests',
    type: ChannelType.GuildText,
    topic: 'Drop a song name or link here to play it automatically!',
    reason: 'Setup dedicated music channel'
  });

  const bannerEmbed = buildBaseEmbed({
    title: '🎵 World Tree Music',
    description: 'Send a song name or link in this channel to automatically play it!\n\nUse the buttons below to control playback when a session is active.',
  }).setImage('https://i.imgur.com/Kz9rS72.png'); // Placeholder aesthetic image

  // Using the existing music player components
  const { buildMusicPlayerComponents } = await import('../../utils/components.js');

  const message = await channel.send({
    embeds: [bannerEmbed],
    components: buildMusicPlayerComponents()
  });

  if (settingsService) {
    await settingsService.setMusicPanel(guild.id, channel.id, message.id);
  }

  await replyToInteraction(interaction, {
    embeds: [buildSuccessEmbed('Music Setup Complete', `Successfully created the dedicated music channel: ${channel}`)]
  });
}
