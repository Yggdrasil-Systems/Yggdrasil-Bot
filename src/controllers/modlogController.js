import { settingsService } from '../services/settingsService.js';
import { buildNeutralEmbed, buildSuccessEmbed } from '../utils/embeds.js';

export async function handleView(guildId) {
  const settings = await settingsService.getEffectiveSettings(guildId);
  if (!settings.modLogChannelId) {
    return { embeds: [buildNeutralEmbed('Mod Log', 'Moderation logs are currently disabled.')] };
  }
  return { embeds: [buildNeutralEmbed('Mod Log', `Moderation logs are sent to <#${settings.modLogChannelId}>.`)] };
}

export async function handleSet(guildId, channelId) {
  const settings = await settingsService.setModLogChannel(guildId, channelId);
  return {
    embeds: [buildSuccessEmbed('Mod log configured', `Moderation logs will be sent to <#${settings.modLogChannelId}>.`)]
  };
}

export async function handleDisable(guildId) {
  await settingsService.setModLogChannel(guildId, null);
  return { embeds: [buildSuccessEmbed('Mod log disabled', 'Moderation logging has been turned off.')] };
}
