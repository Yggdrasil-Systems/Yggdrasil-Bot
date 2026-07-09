import { SlashCommandBuilder } from 'discord.js';
import { QUEUE_DEFAULTS } from '../../config/queueDefaults.js';
import { getAppContext } from '../../context/appContext.js';
import { isQueueVoiceChannelMatch } from '../../services/playerService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'join';
export const aliases = ['connect', 'summon'];
export const allowNoPrefix = true;
export const requiresSameVoiceChannel = true;

export const data = new SlashCommandBuilder().setName('join').setDescription('Makes the bot join your voice channel.');

async function executeJoin(voiceChannel, textChannel, playerService, respond) {
  if (!voiceChannel) {
    return respond({
      embeds: [buildErrorEmbed('Voice Channel Required', 'You need to be in a voice channel for me to join.')]
    });
  }

  const musicPlayer = playerService?.getPlayer();

  if (!musicPlayer) {
    return respond({
      embeds: [buildErrorEmbed('Music Unavailable', 'The music system is not ready yet. Try again in a moment.')]
    });
  }

  let queue = playerService?.getGuildQueue(voiceChannel.guild.id);

  if (!isQueueVoiceChannelMatch(queue, voiceChannel)) {
    return respond({
      embeds: [buildErrorEmbed('Wrong Voice Channel', 'Join my voice channel before using this command.')]
    });
  }

  if (!queue) {
    queue = musicPlayer.nodes.create(voiceChannel.guild, {
      ...QUEUE_DEFAULTS,
      metadata: {
        channel: textChannel,
        is247: false
      }
    });
  }

  try {
    if (!queue.connection) await queue.connect(voiceChannel);
  } catch {
    queue.delete();
    return respond({
      embeds: [buildErrorEmbed('Connection Failed', 'Could not join your voice channel.')]
    });
  }

  return respond({
    embeds: [buildSuccessEmbed('Joined', `Connected to **${voiceChannel.name}**.`)]
  });
}

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  const textChannel = interaction.channel;
  const appContext = getAppContext(interaction) ?? {};
  const playerService = appContext.playerService ?? null;

  await executeJoin(voiceChannel, textChannel, playerService, async (payload) => {
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

  const respondFn = async (payload) => {
    await context.respond(payload);
  };

  await executeJoin(voiceChannel, textChannel, playerService, respondFn);
}
