import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'stop';
export const aliases = ['dc', 'disconnect', 'leave'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stops playback and clears the queue.');

async function executeStop(guildId, respond) {
  const queue = player.nodes.get(guildId);

  if (!queue || !queue.isPlaying()) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  queue.delete();

  return respond({
    embeds: [buildSuccessEmbed('Playback Stopped', 'Stopped the music and cleared the queue.')]
  });
}

export async function execute(interaction) {
  const guildId = interaction.guild.id;

  await executeStop(guildId, async (payload) => {
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

  await executeStop(guildId, respondFn);
}
