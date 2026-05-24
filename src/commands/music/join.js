import { SlashCommandBuilder } from 'discord.js';
import { player } from '../../services/musicService.js';
import { buildErrorEmbed, buildSuccessEmbed } from '../../utils/embeds.js';

export const name = 'join';
export const aliases = ['connect', 'summon'];
export const allowNoPrefix = true;

export const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Makes the bot join your voice channel.');

async function executeJoin(voiceChannel, textChannel, respond) {
  if (!voiceChannel) {
    return respond({
      embeds: [buildErrorEmbed('Voice Channel Required', 'You need to be in a voice channel for me to join.')]
    });
  }

  let queue = player.nodes.get(voiceChannel.guild.id);

  if (!queue) {
    queue = player.nodes.create(voiceChannel.guild, {
      metadata: {
        channel: textChannel
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

  await executeJoin(voiceChannel, textChannel, async (payload) => {
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

  const respondFn = async (payload) => {
    await context.respond(payload);
  };

  await executeJoin(voiceChannel, textChannel, respondFn);
}
