import { SlashCommandBuilder } from 'discord.js';
import { getGuildQueue } from '../../services/playerService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'resume';
export const aliases = ['pause', 'togglepause'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume or pause the current track.');

async function executeResume(guildId, respond) {
  const queue = getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  if (queue.node.isPaused()) {
    queue.node.setPaused(false);
    return respond({
      embeds: [buildSuccessEmbed('▶️ Resumed', `Resumed playing **${queue.currentTrack.title}**.`)]
    });
  }

  queue.node.setPaused(true);
  return respond({
    embeds: [buildSuccessEmbed('⏸️ Paused', `Paused **${queue.currentTrack.title}**.`)]
  });
}

export async function execute(interaction) {
  await executeResume(interaction.guild.id, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  await executeResume(context.guild.id, async (payload) => {
    await context.respond(payload);
  });
}
