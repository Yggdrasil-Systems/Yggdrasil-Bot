import { SlashCommandBuilder } from 'discord.js';
import { QUEUE_DEFAULTS } from '../../config/queueDefaults.js';
import { getAppContext } from '../../context/appContext.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = '247';
export const aliases = ['stay', '24/7'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('247')
  .setDescription('Toggles 24/7 mode, making the bot stay in the voice channel forever.');

async function execute247(voiceChannel, textChannel, playerService, respond) {
  if (!voiceChannel) {
    return respond({
      embeds: [buildErrorEmbed('Voice Channel Required', 'You need to be in a voice channel to enable 24/7 mode.')]
    });
  }

  const musicPlayer = playerService?.getPlayer();

  if (!musicPlayer) {
    return respond({
      embeds: [buildErrorEmbed('Music Unavailable', 'The music system is not ready yet. Try again in a moment.')]
    });
  }

  let queue = playerService?.getGuildQueue(voiceChannel.guild.id);

  if (!queue) {
    queue = musicPlayer.nodes.create(voiceChannel.guild, {
      ...QUEUE_DEFAULTS,
      metadata: {
        channel: textChannel,
        is247: true
      },
      leaveOnEmpty: false,
      leaveOnEnd: false
    });

    try {
      if (!queue.connection) await queue.connect(voiceChannel);
    } catch {
      queue.delete();
      return respond({
        embeds: [buildErrorEmbed('Connection Failed', 'Could not join your voice channel.')]
      });
    }
  }

  // Toggle 24/7 mode
  const currentMode = queue.metadata.is247 || false;
  queue.metadata.is247 = !currentMode;
  
  if (queue.metadata.is247) {
    queue.options.leaveOnEmpty = false;
    queue.options.leaveOnEnd = false;
    return respond({
      embeds: [buildSuccessEmbed('24/7 Mode Enabled', 'I will now stay in the voice channel 24/7, even when nothing is playing.')]
    });
  } else {
    queue.options.leaveOnEmpty = true;
    queue.options.leaveOnEnd = true;
    return respond({
      embeds: [buildSuccessEmbed('24/7 Mode Disabled', 'I will leave the voice channel when inactive.')]
    });
  }
}

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  const textChannel = interaction.channel;
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;

  await execute247(voiceChannel, textChannel, playerService, async (payload) => {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  });
}

export async function executeMessage(context) {
  const voiceChannel = context.member.voice.channel;
  const textChannel = context.message.channel;
  const playerService = context.appContext?.playerService ?? null;

  await execute247(voiceChannel, textChannel, playerService, async (payload) => {
    await context.respond(payload);
  });
}
