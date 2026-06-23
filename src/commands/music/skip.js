import { SlashCommandBuilder } from 'discord.js';
import { getGuildQueue } from '../../services/playerService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'skip';
export const aliases = ['s', 'next'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current track.');

async function executeSkip(guildId, respond) {
  const queue = getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  const skippedTitle = queue.currentTrack.title;
  queue.node.skip();

  return respond({
    embeds: [buildSuccessEmbed('⏭️ Skipped', `Skipped **${skippedTitle}**.`)]
  });
}

export async function execute(interaction) {
  await executeSkip(interaction.guild.id, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  await executeSkip(context.guild.id, async (payload) => {
    await context.respond(payload);
  });
}
