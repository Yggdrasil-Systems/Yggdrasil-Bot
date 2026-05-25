import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'autoplay';
export const aliases = ['ap'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('autoplay')
  .setDescription('Toggle autoplay mode — automatically queue related songs.');

async function executeAutoplay(guildId, respond) {
  const queue = player.nodes.get(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  const wasAutoplay = queue.repeatMode === 3;

  if (wasAutoplay) {
    queue.setRepeatMode(0);
    return respond({
      embeds: [buildSuccessEmbed('📻 Autoplay Disabled', 'Autoplay has been turned off. The queue will stop after the last track.')]
    });
  }

  queue.setRepeatMode(3);
  return respond({
    embeds: [buildSuccessEmbed('📻 Autoplay Enabled', 'Autoplay is now on! Related songs will be automatically queued when the queue ends.')]
  });
}

export async function execute(interaction) {
  await executeAutoplay(interaction.guild.id, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  await executeAutoplay(context.guild.id, async (payload) => {
    await context.respond(payload);
  });
}
