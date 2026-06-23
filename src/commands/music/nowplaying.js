import { SlashCommandBuilder } from 'discord.js';
import { getGuildQueue } from '../../services/playerService.js';
import { buildNowPlayingEmbed, buildErrorEmbed } from '../../utils/embeds.js';
import { buildMusicPlayerComponents } from '../../utils/components.js';

export const name = 'nowplaying';
export const aliases = ['np'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show the currently playing track.');

async function executeNowPlaying(guildId, respond) {
  const queue = getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('Nothing Playing', 'There is no track playing right now. Use `tree play` to start!')]
    });
  }

  return respond({
    embeds: [buildNowPlayingEmbed(queue.currentTrack, queue)],
    components: buildMusicPlayerComponents()
  });
}

export async function execute(interaction) {
  await executeNowPlaying(interaction.guild.id, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  await executeNowPlaying(context.guild.id, async (payload) => {
    await context.respond(payload);
  });
}
