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

function buildRefreshRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Refresh')
      .setCustomId('ping_refresh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
  );
}

function buildFullPingSummary(client, requestedBy) {
  const botInfo = getBotInfoSummary({ client });
  return {
    websocketLatency: Math.max(0, Math.round(client.ws.ping)),
    responseLatency: 0, // will be calculated after round-trip
    clientAvatarUrl: client.user?.displayAvatarURL({ size: 1024, extension: 'png' }),
    uptime: formatDuration(botInfo.uptimeMs),
    memoryUsed: `${botInfo.memoryUsed} MB`,
    guildCount: botInfo.guildCount,
    requestedBy: requestedBy || 'User'
  };
}

export async function execute(interaction) {
  const startTime = Date.now();
  const displayName = interaction.user.displayName ?? interaction.user.username;

  // Send initial response to measure round-trip time
  const reply = await interaction.reply({
    embeds: [buildPingEmbed({
      ...buildFullPingSummary(interaction.client, displayName),
      responseLatency: 0
    })],
    components: [buildRefreshRow()],
    fetchReply: true
  });

  // Now measure the actual round-trip latency
  const responseLatency = Math.max(1, Date.now() - startTime);
  const summary = buildFullPingSummary(interaction.client, displayName);
  summary.responseLatency = responseLatency;

  await interaction.editReply({
    embeds: [buildPingEmbed(summary)],
    components: [buildRefreshRow()]
  });
}

export async function executeMessage(context) {
  const startTime = Date.now();
  const displayName = context.user.displayName ?? context.user.username;

  // Send initial response
  const reply = await context.respond({
    embeds: [buildPingEmbed({
      ...buildFullPingSummary(context.client, displayName),
      responseLatency: 0
    })],
    components: [buildRefreshRow()]
  });

  // Measure the actual round-trip latency
  const responseLatency = Math.max(1, Date.now() - startTime);
  const summary = buildFullPingSummary(context.client, displayName);
  summary.responseLatency = responseLatency;

  // Edit the reply with actual latency
  if (reply?.edit) {
    await reply.edit({
      embeds: [buildPingEmbed(summary)],
      components: [buildRefreshRow()]
    }).catch(() => null);
  }
}
