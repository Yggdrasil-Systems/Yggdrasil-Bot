import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { getPingSummary, getBotInfoSummary } from '../../services/utilityService.js';
import { buildPingEmbed } from '../../utils/embeds.js';
import { replyToInteraction } from '../../utils/responses.js';
import { formatDuration } from '../../utils/formatters.js';

export const name = 'ping';
export const aliases = [];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether World Tree is responsive.');

function enrichPingSummary(raw, client) {
  const botInfo = getBotInfoSummary({ client });
  return {
    ...raw,
    uptime: formatDuration(botInfo.uptimeMs),
    memoryUsed: `${botInfo.memoryUsed} MB`,
    guildCount: botInfo.guildCount,
    requestedBy: null // will be set per-context
  };
}

export async function execute(interaction) {
  const raw = getPingSummary(interaction);
  const ping = enrichPingSummary(raw, interaction.client);
  ping.requestedBy = interaction.user.displayName ?? interaction.user.username;

  const embed = buildPingEmbed(ping);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Refresh')
      .setCustomId('ping_refresh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
  );

  await replyToInteraction(interaction, {
    embeds: [embed],
    components: [row]
  });
}

export async function executeMessage(context) {
  const raw = getPingSummary(context.message);
  const ping = enrichPingSummary(raw, context.client);
  ping.requestedBy = context.user.displayName ?? context.user.username;

  const embed = buildPingEmbed(ping);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Refresh')
      .setCustomId('ping_refresh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
  );

  await context.respond({
    embeds: [embed],
    components: [row]
  });
}
