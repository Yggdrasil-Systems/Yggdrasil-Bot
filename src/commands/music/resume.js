import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'resume';
export const aliases = ['pause', 'togglepause'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Toggles pause/resume for the current track.');

async function executeResume(guildId, respond) {
  const queue = player.nodes.get(guildId);

  if (!queue || !queue.isPlaying()) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  const wasPaused = queue.node.isPaused();
  queue.node.setPaused(!wasPaused);

  if (wasPaused) {
    return respond({
      embeds: [buildSuccessEmbed('Resumed', 'Playback has been resumed.')]
    });
  } else {
    return respond({
      embeds: [buildSuccessEmbed('Paused', 'Playback has been paused.')]
    });
  }
}

export async function execute(interaction) {
  const guildId = interaction.guild.id;

  await executeResume(guildId, async (payload) => {
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

  await executeResume(guildId, respondFn);
}
