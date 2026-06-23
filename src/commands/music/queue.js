import { SlashCommandBuilder } from 'discord.js';
import { getGuildQueue } from '../../services/playerService.js';
import { buildQueueEmbed, buildErrorEmbed } from '../../utils/embeds.js';
import { buildQueueComponents } from '../../utils/components.js';

export const name = 'queue';
export const aliases = ['q'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current music queue.');

async function executeQueue(guildId, respond) {
  const queue = getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now. Use `tree play` to start!')]
    });
  }

  return respond({
    embeds: [buildQueueEmbed(queue)],
    components: queue.tracks.data.length > 0 ? buildQueueComponents() : []
  });
}

export async function execute(interaction) {
  await executeQueue(interaction.guild.id, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  await executeQueue(context.guild.id, async (payload) => {
    await context.respond(payload);
  });
}
