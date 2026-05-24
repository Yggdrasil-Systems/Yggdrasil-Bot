import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'volume';
export const aliases = ['vol'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Sets the playback volume.')
  .addIntegerOption(option =>
    option.setName('level')
      .setDescription('Volume level (0-100)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(100)
  );

async function executeVolume(guildId, vol, respond) {
  const queue = player.nodes.get(guildId);

  if (!queue || !queue.isPlaying()) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  if (vol < 0 || vol > 100) {
    return respond({
      embeds: [buildErrorEmbed('Invalid Volume', 'Volume must be between 0 and 100.')]
    });
  }

  queue.node.setVolume(vol);

  return respond({
    embeds: [buildSuccessEmbed('Volume Set', `Volume has been set to **${vol}%**.`)]
  });
}

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  const vol = interaction.options.getInteger('level');

  await executeVolume(guildId, vol, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const guildId = context.guild.id;
  const vol = parseInt(context.args[0], 10);

  if (isNaN(vol)) {
    return context.respond({
      embeds: [buildErrorEmbed('Invalid Volume', 'Please provide a number between 0 and 100. Usage: `volume <0-100>`')]
    });
  }

  const respondFn = async (payload) => {
    await context.respond(payload);
  };

  await executeVolume(guildId, vol, respondFn);
}
