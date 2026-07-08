import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { getBotInfoSummary } from '../../services/utilityService.js';
import { buildBotInfoEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';

export const name = 'botinfo';
export const aliases = ['bot'];

export const data = new SlashCommandBuilder().setName('botinfo').setDescription('View World Tree runtime details.');

export async function execute(interaction) {
  const summary = getBotInfoSummary({ client: interaction.client });

  const embed = buildBotInfoEmbed(summary);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Invite Me')
      .setURL(
        'https://discord.com/api/oauth2/authorize?client_id=' +
          interaction.client.user.id +
          '&permissions=8&scope=bot%20applications.commands'
      )
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setLabel('Support Server')
      .setURL('https://discord.gg/your-support-server')
      .setStyle(ButtonStyle.Link)
  );

  await replyToInteraction(interaction, {
    embeds: [embed],
    components: [row]
  });
}

export async function executeMessage(context) {
  const summary = getBotInfoSummary({ client: context.client });

  const embed = buildBotInfoEmbed(summary);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Invite Me')
      .setURL(
        'https://discord.com/api/oauth2/authorize?client_id=' +
          context.client.user.id +
          '&permissions=8&scope=bot%20applications.commands'
      )
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setLabel('Support Server')
      .setURL('https://discord.gg/your-support-server')
      .setStyle(ButtonStyle.Link)
  );

  await context.respond({
    embeds: [embed],
    components: [row]
  });
}
