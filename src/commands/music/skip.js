import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'skip';
export const aliases = ['s', 'next'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skips the current track.');

async function executeSkip(guildId, respond) {
  const queue = player.nodes.get(guildId);

  if (!queue || !queue.isPlaying()) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  const currentTrack = queue.currentTrack;
  queue.node.skip();

  return respond({
    embeds: [buildSuccessEmbed('Track Skipped', `Skipped **${currentTrack?.title ?? 'the current track'}**.`)]
  });
}

export async function execute(interaction) {
  const guildId = interaction.guild.id;

  await executeSkip(guildId, async (payload) => {
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

  await executeSkip(guildId, respondFn);
}
