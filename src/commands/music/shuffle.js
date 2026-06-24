import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'shuffle';
export const aliases = ['mix'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('Shuffles the current music queue.');

async function executeShuffle(guildId, playerService, respond) {
  const queue = playerService?.getGuildQueue(guildId);

  if (!queue || !queue.isPlaying()) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  if (queue.tracks.data.length === 0) {
    return respond({
      embeds: [buildErrorEmbed('Nothing to Shuffle', 'There are no upcoming tracks to shuffle.')]
    });
  }

  queue.tracks.shuffle();

  return respond({
    embeds: [buildSuccessEmbed('🔀 Queue Shuffled', `Shuffled **${queue.tracks.data.length}** upcoming tracks.`)]
  });
}

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;

  await executeShuffle(guildId, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const guildId = context.guild.id;
  const playerService = context.appContext?.playerService ?? null;

  const respondFn = async (payload) => {
    await context.respond(payload);
  };

  await executeShuffle(guildId, playerService, respondFn);
}
