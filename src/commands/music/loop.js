import { SlashCommandBuilder } from 'discord.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'loop';
export const aliases = ['repeat'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('Set the loop mode for the current queue.')
  .addStringOption(option =>
    option.setName('mode')
      .setDescription('Loop mode')
      .addChoices(
        { name: 'Off', value: 'off' },
        { name: 'Track', value: 'track' },
        { name: 'Queue', value: 'queue' },
        { name: 'Autoplay', value: 'autoplay' }
      ));

const MODE_MAP = { off: 0, track: 1, queue: 2, autoplay: 3 };
const MODE_LABELS = { 0: '➡️ Off', 1: '🔂 Track', 2: '🔁 Queue', 3: '📻 Autoplay' };

async function executeLoop(modeName, guildId, playerService, respond) {
  const queue = playerService?.getGuildQueue(guildId);

  if (!queue || !queue.currentTrack) {
    return respond({
      embeds: [buildErrorEmbed('No Active Session', 'Nothing is playing right now.')]
    });
  }

  // If no mode specified, cycle through: off → track → queue → off
  if (!modeName) {
    const current = queue.repeatMode;
    const nextMode = current >= 2 ? 0 : current + 1;
    queue.setRepeatMode(nextMode);
    return respond({
      embeds: [buildSuccessEmbed('Loop Updated', `Loop mode set to **${MODE_LABELS[nextMode]}**`)]
    });
  }

  const mode = MODE_MAP[modeName.toLowerCase()];
  if (mode === undefined) {
    return respond({
      embeds: [buildErrorEmbed('Invalid Mode', 'Valid modes: `off`, `track`, `queue`, `autoplay`')]
    });
  }

  queue.setRepeatMode(mode);
  return respond({
    embeds: [buildSuccessEmbed('Loop Updated', `Loop mode set to **${MODE_LABELS[mode]}**`)]
  });
}

export async function execute(interaction) {
  const modeName = interaction.options.getString('mode') || null;
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;
  await executeLoop(modeName, interaction.guild.id, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const modeName = context.args[0] || null;
  const playerService = context.appContext?.playerService ?? null;
  await executeLoop(modeName, context.guild.id, playerService, async (payload) => {
    await context.respond(payload);
  });
}
