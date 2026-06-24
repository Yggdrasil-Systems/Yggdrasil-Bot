import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'stop';
export const aliases = ['dc', 'disconnect', 'leave'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop the music, clear the queue, and disconnect.');

async function executeStop(guildId, playerService, respond) {
  const queue = playerService?.getGuildQueue(guildId);

  if (!queue) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  queue.delete();

  return respond({
    embeds: [buildSuccessEmbed('⏹️ Stopped', 'Stopped the music and cleared the queue. See you next time! 👋')]
  });
}

export async function execute(interaction) {
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;
  await executeStop(interaction.guild.id, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const playerService = context.appContext?.playerService ?? null;
  await executeStop(context.guild.id, playerService, async (payload) => {
    await context.respond(payload);
  });
}
