import { buildPingEmbed } from '../utils/embeds.js';
import { formatDuration } from '../utils/formatters.js';
import { getBotInfoSummary } from '../services/utilityService.js';

export const prefix = 'ping_';

export async function handle(interaction) {
  if (!interaction.customId?.startsWith(prefix)) {
    return false;
  }

  if (!interaction?.isButton?.() || interaction.customId !== 'ping_refresh') {
    return false;
  }

  const startTime = Date.now();
  const client = interaction.client;
  const botInfo = getBotInfoSummary({ client });

  const summary = {
    websocketLatency: Math.max(0, Math.round(client.ws.ping)),
    responseLatency: Math.max(1, Date.now() - startTime),
    clientAvatarUrl: client.user?.displayAvatarURL({ size: 1024, extension: 'png' }),
    uptime: formatDuration(botInfo.uptimeMs),
    memoryUsed: `${botInfo.memoryUsed} MB`,
    guildCount: botInfo.guildCount,
    requestedBy: interaction.user.displayName ?? interaction.user.username
  };

  await interaction.update({ embeds: [buildPingEmbed(summary)] });
  return true;
}

export const handlePingRefreshInteraction = handle;
