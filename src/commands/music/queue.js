import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildQueueEmbed } from '../../utils/embeds.js';
import { buildQueueComponents } from '../../utils/components.js';

export const name = 'queue';
export const aliases = ['q'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Shows the current music queue.');

async function executeQueue(guildId, respond) {
  const queue = player.nodes.get(guildId);

  if (!queue || !queue.isPlaying()) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  return respond({
    embeds: [buildQueueEmbed(queue)],
    components: queue.tracks.data.length > 0 ? buildQueueComponents() : []
  });
}

export async function execute(interaction) {
  const guildId = interaction.guild.id;

  await executeQueue(guildId, async (payload) => {
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

  await executeQueue(guildId, respondFn);
}
