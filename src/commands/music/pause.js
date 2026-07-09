import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'pause';
export const aliases = [];
export const allowNoPrefix = true;
export const requiresSameVoiceChannel = true;

export const data = new SlashCommandBuilder().setName('pause').setDescription('Pause the current track.');

async function executePause(guildId, playerService, respond) {
  const queue = playerService?.getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  if (queue.node.isPaused()) {
    return respond({
      embeds: [buildSuccessEmbed('⏸️ Already Paused', 'Playback is already paused.')]
    });
  }

  queue.node.setPaused(true);
  return respond({
    embeds: [buildSuccessEmbed('⏸️ Paused', `Paused **${queue.currentTrack.title}**.`)]
  });
}

export async function execute(interaction) {
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;
  await executePause(interaction.guild.id, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const playerService = context.appContext?.playerService ?? null;
  await executePause(context.guild.id, playerService, async (payload) => {
    await context.respond(payload);
  });
}
