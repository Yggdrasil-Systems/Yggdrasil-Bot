import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'stop';
export const aliases = ['dc', 'disconnect', 'leave'];
export const allowNoPrefix = true;
export const requiresSameVoiceChannel = true;

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

  const was247 = queue.metadata?.is247 ?? false;
  queue.delete();

  const description = was247
    ? 'Stopped the music, cleared the queue, and **disabled 24/7 mode**. 👋'
    : 'Stopped the music and cleared the queue. See you next time! 👋';

  return respond({
    embeds: [buildSuccessEmbed('⏹️ Stopped', description)]
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
