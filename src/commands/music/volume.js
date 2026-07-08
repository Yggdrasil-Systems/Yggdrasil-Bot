import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'volume';
export const aliases = ['vol'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set the playback volume.')
  .addIntegerOption((option) =>
    option.setName('level').setDescription('Volume level (0-100)').setMinValue(0).setMaxValue(100)
  );

async function executeVolume(level, guildId, playerService, respond) {
  const queue = playerService?.getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  // Show current volume if no level specified
  if (level === null || level === undefined) {
    return respond({
      embeds: [buildSuccessEmbed('🔊 Volume', `Current volume: **${queue.node.volume ?? 80}%**`)]
    });
  }

  if (level < 0 || level > 100) {
    return respond({
      embeds: [buildErrorEmbed('Invalid Volume', 'Volume must be between **0** and **100**.')]
    });
  }

  queue.node.setVolume(level);

  const emoji = level === 0 ? '🔇' : level < 30 ? '🔉' : level < 70 ? '🔊' : '📢';
  return respond({
    embeds: [buildSuccessEmbed(`${emoji} Volume Set`, `Volume set to **${level}%**`)]
  });
}

export async function execute(interaction) {
  const level = interaction.options.getInteger('level');
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;
  await executeVolume(level, interaction.guild.id, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const level = context.args[0] ? parseInt(context.args[0], 10) : null;
  const playerService = context.appContext?.playerService ?? null;
  await executeVolume(Number.isFinite(level) ? level : null, context.guild.id, playerService, async (payload) => {
    await context.respond(payload);
  });
}
