import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildNowPlayingEmbed } from '../../utils/embeds.js';
import { buildMusicPlayerComponents } from '../../utils/components.js';

export const name = 'nowplaying';
export const aliases = ['np'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Shows the currently playing track.');

async function executeNowPlaying(guildId, respond) {
  const queue = player.nodes.get(guildId);

  if (!queue || !queue.isPlaying()) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  const track = queue.currentTrack;

  return respond({
    embeds: [buildNowPlayingEmbed(track, queue)],
    components: buildMusicPlayerComponents()
  });
}

export async function execute(interaction) {
  const guildId = interaction.guild.id;

  await executeNowPlaying(guildId, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const guildId = context.guild.id;

  const respondFn = async (payload) => {
    await context.respond(payload);
  };

  await executeNowPlaying(guildId, respondFn);
}
