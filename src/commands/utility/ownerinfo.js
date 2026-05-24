import { SlashCommandBuilder } from 'discord.js';

import { buildOwnerInfoEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'ownerinfo';
export const aliases = ['owner'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('ownerinfo')
  .setDescription('View information about the bot creator.');

export async function execute(interaction) {
  // We can fetch the application owner dynamically or use a configured ID.
  const appInfo = await interaction.client.application.fetch();
  const owner = appInfo.owner;
  
  const summary = {
    ownerId: owner.id,
    ownerAvatarUrl: owner.displayAvatarURL({ size: 1024, extension: 'png' })
  };

  await replyToInteraction(interaction, {
    embeds: [buildOwnerInfoEmbed(summary)]
  });
}

export async function executeMessage(context) {
  const appInfo = await context.client.application.fetch();
  const owner = appInfo.owner;
  
  const summary = {
    ownerId: owner.id,
    ownerAvatarUrl: owner.displayAvatarURL({ size: 1024, extension: 'png' })
  };

  await context.respond({
    embeds: [buildOwnerInfoEmbed(summary)]
  });
}
